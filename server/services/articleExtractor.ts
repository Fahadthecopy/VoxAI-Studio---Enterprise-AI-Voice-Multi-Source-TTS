import * as cheerio from 'cheerio';
import { validateUrlForSsrf } from './ssrfValidator.js';

export interface ExtractedArticle {
  success: boolean;
  sourceType: 'article';
  url: string;
  domain: string;
  title: string;
  author?: string;
  publishedDate?: string;
  characters: number;
  words: number;
  sentences: number;
  paragraphs: number;
  estimatedDurationSeconds: number;
  text: string;
  error?: string;
}

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 10000; // 10 seconds
const MAX_REDIRECTS = 3;

/**
 * Safely fetches a remote URL with SSRF protection, redirect verification,
 * timeout, and response byte caps.
 */
async function safeFetchUrl(initialUrl: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (redirectCount <= MAX_REDIRECTS) {
    const validation = await validateUrlForSsrf(currentUrl);
    if (!validation.valid || !validation.url) {
      throw new Error(validation.error || 'Blocked by SSRF security check');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual', // Manual redirects so every hop is verified for SSRF
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 VoxAI-Reader/1.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out while fetching article (10s limit).');
      }
      throw new Error(`Failed to establish connection: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // Check for redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Server returned redirect status without Location header');
      }
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl;
      redirectCount++;
      continue;
    }

    if (!response.ok) {
      throw new Error(`Website responded with HTTP status ${response.status} (${response.statusText})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/xhtml+xml')
    ) {
      throw new Error(
        `Unsupported content type: "${contentType}". Only web articles and HTML/text pages can be imported.`
      );
    }

    // Stream body and enforce byte limit
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      return { html: text, finalUrl: currentUrl };
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > MAX_RESPONSE_BYTES) {
          reader.cancel();
          throw new Error('Article page exceeds maximum allowed size (5 MB limit).');
        }
        chunks.push(value);
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(totalBuffer);
    return { html, finalUrl: currentUrl };
  }

  throw new Error('Too many redirects while accessing article.');
}

/**
 * Extracts, cleans, and structures readable article content from HTML.
 */
export async function extractArticleFromUrl(url: string): Promise<ExtractedArticle> {
  const domain = new URL(url).hostname.replace(/^www\./, '');

  let html: string;
  let finalUrl: string;
  try {
    const fetchResult = await safeFetchUrl(url);
    html = fetchResult.html;
    finalUrl = fetchResult.finalUrl;
  } catch (err: any) {
    return {
      success: false,
      sourceType: 'article',
      url,
      domain,
      title: '',
      characters: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      estimatedDurationSeconds: 0,
      text: '',
      error:
        err.message ||
        "We couldn't extract readable content from this article. The website may block automated access or require authentication. Try another article URL, paste the article text manually, or upload the article as a supported file.",
    };
  }

  try {
    const $ = cheerio.load(html);

    // Extract title
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      'Untitled Article';

    // Clean title (remove common site suffixes like " | CNN", " - The New York Times")
    title = title.split(/\s+[|\-–—]\s+/)[0]?.trim() || title;

    // Extract Author
    const author =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('[rel="author"]').first().text().trim() ||
      $('.byline, .author-name, .article-author').first().text().trim() ||
      undefined;

    // Extract Published Date
    const publishedDate =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content') ||
      $('time').first().attr('datetime') ||
      undefined;

    // Remove noise, headers, footers, scripts, ads, cookie banners, navs
    const unwantedSelectors = [
      'script',
      'style',
      'noscript',
      'svg',
      'canvas',
      'iframe',
      'nav',
      'header',
      'footer',
      'aside',
      'form',
      '.ad',
      '.ads',
      '.advertisement',
      '.social-share',
      '.share-buttons',
      '.share-container',
      '.cookie-banner',
      '.cookie-consent',
      '.consent-banner',
      '.related-articles',
      '.recommended',
      '.comments',
      '#comments',
      '.disqus',
      '.sidebar',
      '.newsletter-signup',
      '.subscription-banner',
      '[role="banner"]',
      '[role="navigation"]',
      '[role="complementary"]',
      '.breadcrumb',
      '.menu',
      '.nav',
    ];

    unwantedSelectors.forEach(selector => $(selector).remove());

    // Search for article root container
    let container = $(
      'article, [role="main"], main, .article-content, .entry-content, .post-content, .story-body, .article__body'
    ).first();

    if (!container.length) {
      container = $('body');
    }

    // Extract text blocks
    const contentParts: string[] = [];
    const seen = new Set<string>();

    container.find('h1, h2, h3, h4, p, blockquote, ul, ol').each((_, el) => {
      const tagName = el.tagName.toLowerCase();
      const node = $(el);

      // Skip empty or tiny elements
      const text = node.text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 3) return;

      // Avoid duplicate headings or repeated text
      const hash = text.toLowerCase();
      if (seen.has(hash)) return;
      seen.add(hash);

      // Do not duplicate main title if it appears in h1
      if (tagName === 'h1' && text.toLowerCase() === title.toLowerCase()) {
        return;
      }

      if (tagName.startsWith('h')) {
        contentParts.push(`\n## ${text}\n`);
      } else if (tagName === 'blockquote') {
        contentParts.push(`"${text}"`);
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items: string[] = [];
        node.find('li').each((__, li) => {
          const itemText = $(li).text().replace(/\s+/g, ' ').trim();
          if (itemText) items.push(`• ${itemText}`);
        });
        if (items.length > 0) {
          contentParts.push(items.join('\n'));
        }
      } else {
        contentParts.push(text);
      }
    });

    let cleanedText = contentParts.join('\n\n').trim();

    // If empty or too short, fallback to paragraphs
    if (cleanedText.length < 50) {
      const fallbackParagraphs: string[] = [];
      $('p').each((_, el) => {
        const pText = $(el).text().replace(/\s+/g, ' ').trim();
        if (pText.length > 25) {
          fallbackParagraphs.push(pText);
        }
      });
      cleanedText = fallbackParagraphs.join('\n\n').trim();
    }

    if (!cleanedText || cleanedText.length < 30) {
      return {
        success: false,
        sourceType: 'article',
        url: finalUrl,
        domain,
        title,
        author,
        publishedDate,
        characters: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        estimatedDurationSeconds: 0,
        text: '',
        error:
          "We couldn't extract readable article content from this page. Try copying the article text into Text mode or upload the article as a supported file.",
      };
    }

    const characters = cleanedText.length;
    const words = cleanedText.split(/\s+/).filter(Boolean).length;
    const sentences = cleanedText.split(/[.!?]+/).filter(Boolean).length;
    const paragraphs = cleanedText.split(/\n+/).filter(Boolean).length;
    // Standard reading speed for speech is ~150 words per minute (2.5 words per sec)
    const estimatedDurationSeconds = Math.max(1, Math.round((words / 150) * 60));

    return {
      success: true,
      sourceType: 'article',
      url: finalUrl,
      domain,
      title,
      author,
      publishedDate,
      characters,
      words,
      sentences,
      paragraphs,
      estimatedDurationSeconds,
      text: cleanedText,
    };
  } catch (err: any) {
    return {
      success: false,
      sourceType: 'article',
      url: finalUrl || url,
      domain,
      title: '',
      characters: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      estimatedDurationSeconds: 0,
      text: '',
      error: `Failed to parse article: ${err.message}`,
    };
  }
}
