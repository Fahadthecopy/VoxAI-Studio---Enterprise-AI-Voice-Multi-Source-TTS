import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export interface ExtractedFileResult {
  success: boolean;
  sourceType: 'file';
  fileName: string;
  fileType: string;
  fileSize: number;
  characters: number;
  words: number;
  sentences: number;
  paragraphs: number;
  pages?: number;
  estimatedDurationSeconds: number;
  text: string;
  isScannedPdf?: boolean;
  error?: string;
}

/**
 * Strips RTF control codes, font tables, and markup to extract clean plain text.
 */
function extractTextFromRtf(rtfString: string): string {
  // 1. Remove font tables, stylesheets, color tables, info groups
  let text = rtfString.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi, '');
  // 2. Remove curly braces with control words like {\*\...}
  text = text.replace(/\{\\\*[^}]+}/g, '');
  // 3. Replace paragraph / line break controls with newlines
  text = text.replace(/\\(par|line)\b/g, '\n');
  text = text.replace(/\\tab\b/g, '\t');
  // 4. Decode hex characters \'hh
  text = text.replace(/\\'[0-9a-fA-F]{2}/g, match => {
    const code = parseInt(match.substring(2), 16);
    return String.fromCharCode(code);
  });
  // 5. Remove remaining control words \word123
  text = text.replace(/\\[a-zA-Z]+-?\d* ?/g, '');
  // 6. Remove remaining braces
  text = text.replace(/[{}]/g, '');
  // 7. Clean up extra spacing
  return cleanExtractedText(text);
}

/**
 * Normalizes line endings, cleans unnecessary repeating page headers/footers,
 * and strips duplicate whitespace.
 */
export function cleanExtractedText(raw: string): string {
  if (!raw) return '';

  let cleaned = raw
    // Normalize Windows/Mac line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove null bytes or control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove isolated page number lines like "Page 1 of 12" or "- 4 -"
    .replace(/^\s*(?:Page\s+\d+(?:\s+of\s+\d+)?|-?\s*\d+\s*-?)\s*$/gim, '')
    // Collapse multiple consecutive blank lines to at most 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim line edges
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();

  return cleaned;
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
  mimetype?: string
): Promise<ExtractedFileResult> {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const fileSize = buffer.length;

  try {
    let rawText = '';
    let pages: number | undefined = undefined;
    let isScannedPdf = false;

    if (extension === '.txt') {
      rawText = buffer.toString('utf-8');
    } else if (extension === '.md') {
      rawText = buffer.toString('utf-8');
    } else if (extension === '.rtf') {
      rawText = extractTextFromRtf(buffer.toString('utf-8'));
    } else if (extension === '.docx') {
      const docxResult = await mammoth.extractRawText({ buffer });
      rawText = docxResult.value;
    } else if (extension === '.pdf') {
      // Magic bytes check for PDF (%PDF-)
      if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) !== '%PDF') {
        throw new Error('Corrupted or invalid PDF format. Magic header "%PDF" not found.');
      }

      const parser = new PDFParse({ data: buffer });
      try {
        const pdfData = await parser.getText();
        pages = pdfData.total || 1;
        rawText = pdfData.text || '';
      } finally {
        await parser.destroy();
      }

      // Check if scanned / image-only PDF
      const selectableChars = rawText.replace(/\s+/g, '').length;
      if (selectableChars < 20) {
        isScannedPdf = true;
        return {
          success: false,
          sourceType: 'file',
          fileName,
          fileType: extension,
          fileSize,
          characters: 0,
          words: 0,
          sentences: 0,
          paragraphs: 0,
          pages,
          estimatedDurationSeconds: 0,
          text: '',
          isScannedPdf: true,
          error:
            'This PDF does not contain selectable text. It appears to be an image-only or scanned document. (No OCR engine configured).',
        };
      }
    } else {
      return {
        success: false,
        sourceType: 'file',
        fileName,
        fileType: extension,
        fileSize,
        characters: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        estimatedDurationSeconds: 0,
        text: '',
        error: `Unsupported file type: "${extension}". Please upload TXT, PDF, DOCX, RTF, or MD.`,
      };
    }

    const cleanedText = cleanExtractedText(rawText);

    if (!cleanedText || cleanedText.length === 0) {
      return {
        success: false,
        sourceType: 'file',
        fileName,
        fileType: extension,
        fileSize,
        characters: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        pages,
        estimatedDurationSeconds: 0,
        text: '',
        error: 'No readable text was found in this file.',
      };
    }

    const characters = cleanedText.length;
    const words = cleanedText.split(/\s+/).filter(Boolean).length;
    const sentences = cleanedText.split(/[.!?]+/).filter(Boolean).length;
    const paragraphs = cleanedText.split(/\n+/).filter(Boolean).length;
    const estimatedDurationSeconds = Math.max(1, Math.round((words / 150) * 60));

    return {
      success: true,
      sourceType: 'file',
      fileName,
      fileType: extension,
      fileSize,
      characters,
      words,
      sentences,
      paragraphs,
      pages,
      estimatedDurationSeconds,
      text: cleanedText,
    };
  } catch (err: any) {
    return {
      success: false,
      sourceType: 'file',
      fileName,
      fileType: extension,
      fileSize,
      characters: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      estimatedDurationSeconds: 0,
      text: '',
      error: `Failed to extract text from ${fileName}: ${err.message || 'File may be corrupted or encrypted'}`,
    };
  }
}
