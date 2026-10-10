import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { extractArticleFromUrl } from './server/services/articleExtractor.js';
import { validateUrlForSsrf } from './server/services/ssrfValidator.js';
import { extractTextFromFile } from './server/services/fileExtractor.js';
import { VOICE_CATALOG, synthesizeAudio, chunkText } from './server/services/ttsService.js';
import { store, GenerationRecord } from './server/services/store.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer upload setup in memory with configurable size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: store.adminSettings.maxFileSizeMb * 1024 * 1024,
    files: store.adminSettings.maxFilesPerUpload,
  },
});

// Middleware for audit logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        store.addLog('warn', `${req.method} ${req.path} [${res.statusCode}] - ${duration}ms`);
      }
    });
  }
  next();
});

// ==========================================
// 1. VOICE CATALOG API
// ==========================================
app.get('/api/voices', (req: Request, res: Response) => {
  const { language, gender, provider, useCase } = req.query;
  let filtered = [...VOICE_CATALOG];

  if (language && typeof language === 'string') {
    filtered = filtered.filter(v => v.language.toLowerCase() === language.toLowerCase() || v.languageCode.toLowerCase() === language.toLowerCase());
  }
  if (gender && typeof gender === 'string') {
    filtered = filtered.filter(v => v.gender === gender.toLowerCase());
  }
  if (provider && typeof provider === 'string') {
    filtered = filtered.filter(v => v.provider === provider.toLowerCase());
  }
  if (useCase && typeof useCase === 'string') {
    filtered = filtered.filter(v => v.useCases.some(u => u.toLowerCase().includes(useCase.toLowerCase())));
  }

  res.json({
    success: true,
    total: filtered.length,
    voices: filtered,
  });
});

app.get('/api/voices/:id', (req: Request, res: Response) => {
  const voice = VOICE_CATALOG.find(v => v.id === req.params.id);
  if (!voice) {
    res.status(404).json({ success: false, error: 'Voice not found' });
    return;
  }
  res.json({ success: true, voice });
});

// ==========================================
// 2. CONTENT EXTRACTION: FILE UPLOAD
// ==========================================
app.post(
  '/api/content/extract-file',
  upload.array('files', store.adminSettings.maxFilesPerUpload),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No file was uploaded. Please upload a TXT, PDF, DOCX, RTF, or MD file.',
        });
        return;
      }

      // Check max allowed file size against current admin limit
      const maxBytes = store.adminSettings.maxFileSizeMb * 1024 * 1024;
      for (const file of files) {
        if (file.size > maxBytes) {
          res.status(413).json({
            success: false,
            error: `File "${file.originalname}" is too large. Maximum allowed size is ${store.adminSettings.maxFileSizeMb} MB.`,
          });
          return;
        }
      }

      const results = [];
      for (const file of files) {
        const extracted = await extractTextFromFile(file.buffer, file.originalname, file.mimetype);
        results.push(extracted);
      }

      if (results.length === 1) {
        const single = results[0];
        if (!single.success) {
          res.status(422).json(single);
          return;
        }
        res.json(single);
        return;
      }

      // Multiple files uploaded
      const allSuccessful = results.filter(r => r.success);
      const combinedText = allSuccessful.map(r => `--- ${r.fileName} ---\n\n${r.text}`).join('\n\n');
      const totalChars = combinedText.length;
      const totalWords = combinedText.split(/\s+/).filter(Boolean).length;

      res.json({
        success: allSuccessful.length > 0,
        sourceType: 'file',
        totalFiles: files.length,
        files: results,
        combined: {
          characters: totalChars,
          words: totalWords,
          estimatedDurationSeconds: Math.round((totalWords / 150) * 60),
          text: combinedText,
        },
      });
    } catch (err: any) {
      store.addLog('error', 'File extraction error: ' + err.message);
      res.status(500).json({
        success: false,
        error: `File processing failed: ${err.message}`,
      });
    }
  }
);

// ==========================================
// 3. CONTENT EXTRACTION: ARTICLE LINK
// ==========================================
app.post('/api/content/validate-url', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ valid: false, error: 'URL is required.' });
    return;
  }
  const result = await validateUrlForSsrf(url);
  res.json({
    valid: result.valid,
    error: result.error,
    resolvedIp: result.valid ? result.resolvedIp : undefined,
  });
});

app.post('/api/content/extract-article', async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Please enter a valid HTTP or HTTPS article URL.',
    });
    return;
  }

  try {
    const extracted = await extractArticleFromUrl(url);
    if (!extracted.success) {
      res.status(422).json(extracted);
      return;
    }
    res.json(extracted);
  } catch (err: any) {
    store.addLog('error', `Article fetch error for ${url}: ${err.message}`);
    res.status(500).json({
      success: false,
      error:
        "We couldn't access this article. The website may block automated access or require authentication. Try another URL or paste the text manually.",
    });
  }
});

// ==========================================
// 4. UNIFIED TTS GENERATION PIPELINE
// ==========================================
app.post('/api/tts/generate', async (req: Request, res: Response): Promise<void> => {
  const {
    text,
    voiceId = 'kore',
    language = 'en-US',
    emotion = 'Natural',
    style = 'Narration',
    speed = 1.0,
    pitch = 0,
    volume = 1.0,
    format = 'mp3',
    sourceType = 'text',
    sourceName = 'Text Editor',
    sourceUrl,
    originalFileName,
    projectId,
    title,
  } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Text payload is empty. Please provide text to synthesize.',
    });
    return;
  }

  const voice = VOICE_CATALOG.find(v => v.id === voiceId) || VOICE_CATALOG[0];

  // Apply Pronunciation replacements
  let processedText = text;
  store.pronunciations.forEach(entry => {
    if (processedText.includes(entry.word)) {
      const regex = new RegExp(`\\b${entry.word}\\b`, 'gi');
      processedText = processedText.replace(regex, entry.replacement);
    }
  });

  // Long text chunking verification
  const chunks = chunkText(processedText, 800);
  const totalChunks = chunks.length;

  try {
    const synthResult = await synthesizeAudio({
      text: processedText,
      voiceId: voice.id,
      speed: Number(speed),
      pitch: Number(pitch),
      volume: Number(volume),
      emotion,
      style,
    });

    // Store audio buffer
    const audioFileId = store.storeAudio(synthResult.buffer, 'audio/wav', `${voice.name.replace(/\s+/g, '_')}_speech.wav`);
    const audioUrl = `/api/audio/${audioFileId}.wav`;

    const words = processedText.split(/\s+/).filter(Boolean).length;
    const genId = 'gen_' + Date.now();

    const generationRecord: GenerationRecord = {
      id: genId,
      projectId: projectId || undefined,
      title: title || (text.slice(0, 40) + '...').replace(/\n/g, ' '),
      sourceType,
      sourceName: sourceName || (sourceType === 'article' ? sourceUrl : originalFileName || 'Text Draft'),
      sourceUrl: sourceUrl || undefined,
      originalFileName: originalFileName || undefined,
      extractedText: text,
      characterCount: text.length,
      wordCount: words,
      voiceId: voice.id,
      voiceName: voice.name,
      language: voice.language,
      languageCode: voice.languageCode,
      emotion,
      style,
      speed: Number(speed),
      pitch: Number(pitch),
      format: format === 'wav' ? 'wav' : 'mp3',
      audioFileId,
      audioUrl,
      duration: synthResult.duration,
      provider: synthResult.provider,
      model: voice.provider === 'gemini' ? 'gemini-3.8-flash-lite-tts' : 'voxai-acoustic-v2',
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.generations.set(genId, generationRecord);

    // Update usage metrics
    store.usage.charactersUsed += text.length;
    store.usage.audioMinutes = +(store.usage.audioMinutes + synthResult.duration / 60).toFixed(2);
    store.usage.generationCount += 1;

    store.addLog(
      'info',
      `TTS Generated: ${genId} (${text.length} chars, ${synthResult.duration}s, ${voice.name})`
    );

    res.json({
      success: true,
      generationId: genId,
      audioUrl,
      audioFileId,
      duration: synthResult.duration,
      charactersUsed: text.length,
      wordCount: words,
      totalChunks,
      provider: synthResult.provider,
      model: generationRecord.model,
      voice: {
        id: voice.id,
        name: voice.name,
        language: voice.language,
      },
      createdAt: generationRecord.createdAt,
    });
  } catch (err: any) {
    store.addLog('error', 'Audio synthesis failed: ' + err.message);
    res.status(500).json({
      success: false,
      error: `Voice generation failed: ${err.message}`,
    });
  }
});

// Audio streaming endpoint with HTTP Range support for seamless seeking
app.get('/api/audio/:id', (req: Request, res: Response): void => {
  const cleanId = req.params.id.replace(/\.(wav|mp3)$/, '');
  const item = store.audioFiles.get(cleanId);

  if (!item) {
    res.status(404).send('Audio file not found or expired');
    return;
  }

  const totalLength = item.buffer.length;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

    if (start >= totalLength) {
      res.status(416).set('Content-Range', `bytes */${totalLength}`).end();
      return;
    }

    const chunksize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': item.mimeType,
    });

    res.end(item.buffer.subarray(start, end + 1));
  } else {
    res.writeHead(200, {
      'Content-Length': totalLength,
      'Content-Type': item.mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${item.filename}"`,
    });
    res.end(item.buffer);
  }
});

// ==========================================
// 5. AI TEXT IMPROVEMENT (Gemini API)
// ==========================================
app.post('/api/tts/improve-text', async (req: Request, res: Response): Promise<void> => {
  const { text, action } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ success: false, error: 'Text is required for improvement.' });
    return;
  }

  const actionPrompts: Record<string, string> = {
    improve_script: 'Improve this text for spoken speech delivery, ensuring clear flow, natural cadence, and engaging rhythm. Keep all key information intact.',
    fix_grammar: 'Correct all grammar, spelling, and punctuation errors while maintaining the original tone and style.',
    more_natural: 'Make this script sound more natural, expressive, and conversational when read aloud by an AI voice.',
    more_professional: 'Refine the wording to sound polished, authoritative, and professional for an executive or corporate voiceover.',
    conversational: 'Transform the tone into a casual, warm, conversational podcast style dialogue.',
    shorten: 'Condense and tighten the text for a brisk, concise audio summary without losing essential points.',
    expand: 'Expand the explanation with vivid illustrative descriptions and smooth narrative transitions.',
    summarize: 'Summarize the core narrative into 3-4 impactful narration-ready paragraphs.',
    create_narration: 'Structure this text as a compelling documentary narrative with dramatic pacing and pauses.',
    create_youtube_script: 'Format this as a high-retention YouTube video script with an engaging hook, smooth body, and clear outro.',
  };

  const instruction = actionPrompts[action] || actionPrompts.improve_script;

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    // Graceful fallback text cleaner
    const fallbackCleaned = text
      .replace(/\s+/g, ' ')
      .trim();
    res.json({
      success: true,
      action,
      improvedText: fallbackCleaned,
      note: 'Processed via text normalizer.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an expert voiceover script editor for VoxAI Studio. ${instruction}
Return ONLY the revised speech text. Do NOT add meta commentary, introduction, or quotes around the response.

Original text:
${text}`,
            },
          ],
        },
      ],
    });

    const improvedText = response.text?.trim() || text;

    res.json({
      success: true,
      action,
      originalLength: text.length,
      improvedLength: improvedText.length,
      improvedText,
    });
  } catch (err: any) {
    store.addLog('error', 'AI improve text error: ' + err.message);
    res.status(500).json({
      success: false,
      error: `AI script enhancement failed: ${err.message}`,
    });
  }
});

// ==========================================
// 6. GENERATION HISTORY & PROJECTS
// ==========================================
app.get('/api/generations', (req: Request, res: Response) => {
  const list = Array.from(store.generations.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, total: list.length, generations: list });
});

app.delete('/api/generations/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const record = store.generations.get(id);
  if (!record) {
    res.status(404).json({ success: false, error: 'Generation not found' });
    return;
  }
  if (record.audioFileId) {
    store.audioFiles.delete(record.audioFileId);
  }
  store.generations.delete(id);
  res.json({ success: true, message: 'Generation deleted successfully' });
});

app.get('/api/projects', (req: Request, res: Response) => {
  res.json({ success: true, projects: Array.from(store.projects.values()) });
});

app.post('/api/projects', (req: Request, res: Response): void => {
  const { name, description, type } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: 'Project name is required' });
    return;
  }
  const id = 'proj_' + Date.now();
  const proj = {
    id,
    name,
    description: description || '',
    type: type || 'general',
    generationCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.projects.set(id, proj);
  res.json({ success: true, project: proj });
});

// ==========================================
// 7. PRONUNCIATIONS DICTIONARY
// ==========================================
app.get('/api/pronunciations', (req: Request, res: Response) => {
  res.json({ success: true, dictionary: Array.from(store.pronunciations.values()) });
});

app.post('/api/pronunciations', (req: Request, res: Response): void => {
  const { word, replacement, languageCode = 'en-US' } = req.body;
  if (!word || !replacement) {
    res.status(400).json({ success: false, error: 'Word and replacement are required' });
    return;
  }
  const id = 'pr_' + Date.now();
  const entry = {
    id,
    word: word.trim(),
    replacement: replacement.trim(),
    languageCode,
    createdAt: new Date().toISOString(),
  };
  store.pronunciations.set(id, entry);
  res.json({ success: true, entry });
});

app.delete('/api/pronunciations/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  store.pronunciations.delete(id);
  res.json({ success: true, message: 'Pronunciation rule removed' });
});

// ==========================================
// 8. USAGE & PLANS
// ==========================================
app.get('/api/usage', (req: Request, res: Response) => {
  res.json({
    success: true,
    usage: store.usage,
    percentages: {
      charactersUsed: Math.min(100, Math.round((store.usage.charactersUsed / store.usage.planLimit) * 100)),
    },
  });
});

app.get('/api/plans', (req: Request, res: Response) => {
  res.json({
    success: true,
    currentPlan: store.usage.planTier,
    plans: [
      {
        id: 'free',
        name: 'Free Starter',
        price: '$0/mo',
        characterLimit: 10000,
        features: ['10,000 chars/month', 'Standard voices', 'MP3 & WAV download', 'Text & File uploads'],
      },
      {
        id: 'pro',
        name: 'Creator Pro',
        price: '$19/mo',
        characterLimit: 100000,
        isPopular: true,
        features: [
          '100,000 chars/month',
          'All 14+ Multilingual voices',
          'Article Link Safe Fetcher',
          'Document OCR detection',
          'Podcast & YouTube modes',
          'Pronunciation dictionary',
        ],
      },
      {
        id: 'business',
        name: 'Studio Enterprise',
        price: '$79/mo',
        characterLimit: 1000000,
        features: [
          '1,000,000 chars/month',
          'Unlimited chunking & long-form',
          'Team collaboration',
          'High priority audio queue',
          'Dedicated API keys & SSO',
        ],
      },
    ],
  });
});

// ==========================================
// 9. ADMIN PANEL & SETTINGS
// ==========================================
app.get('/api/admin/overview', (req: Request, res: Response) => {
  res.json({
    success: true,
    settings: store.adminSettings,
    stats: {
      totalGenerations: store.generations.size,
      totalAudioBuffers: store.audioFiles.size,
      totalProjects: store.projects.size,
      totalPronunciations: store.pronunciations.size,
      charactersProcessed: store.usage.charactersUsed,
      logsCount: store.logs.length,
    },
    logs: store.logs.slice(0, 30),
    providers: [
      {
        name: 'Google Gemini Audio Studio',
        status: process.env.GEMINI_API_KEY ? 'Active (Connected)' : 'Configured (Auto)',
        type: 'Primary LLM Speech',
        model: 'gemini-3.8-flash-lite-tts',
      },
      {
        name: 'VoxAI Acoustic Neural Engine',
        status: 'Active (Online)',
        type: 'Real-time Waveform Synthesizer',
        model: 'vocal-formant-v2',
      },
      {
        name: 'ElevenLabs Abstraction Layer',
        status: process.env.ELEVENLABS_API_KEY ? 'Active' : 'Disabled (Key Not Set)',
        type: 'External Voice API',
      },
      {
        name: 'Azure Speech Services',
        status: process.env.AZURE_SPEECH_KEY ? 'Active' : 'Disabled (Key Not Set)',
        type: 'Cognitive Speech',
      },
    ],
  });
});

app.post('/api/admin/settings', (req: Request, res: Response) => {
  const { maxFileSizeMb, maxFilesPerUpload, articleFetchTimeoutMs, enableGeminiTts } = req.body;
  if (maxFileSizeMb !== undefined) store.adminSettings.maxFileSizeMb = Number(maxFileSizeMb);
  if (maxFilesPerUpload !== undefined) store.adminSettings.maxFilesPerUpload = Number(maxFilesPerUpload);
  if (articleFetchTimeoutMs !== undefined) store.adminSettings.articleFetchTimeoutMs = Number(articleFetchTimeoutMs);
  if (enableGeminiTts !== undefined) store.adminSettings.enableGeminiTts = Boolean(enableGeminiTts);

  store.addLog('info', 'Admin settings updated', store.adminSettings);
  res.json({ success: true, settings: store.adminSettings });
});

// ==========================================
// VITE DEV SERVER / PRODUCTION SERVING
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VoxAI Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
