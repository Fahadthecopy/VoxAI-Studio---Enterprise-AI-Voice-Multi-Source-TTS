import crypto from 'node:crypto';

export interface GenerationRecord {
  id: string;
  projectId?: string;
  title: string;
  sourceType: 'text' | 'file' | 'article';
  sourceName: string;
  sourceUrl?: string;
  originalFileName?: string;
  extractedText: string;
  characterCount: number;
  wordCount: number;
  voiceId: string;
  voiceName: string;
  language: string;
  languageCode: string;
  emotion: string;
  style: string;
  speed: number;
  pitch: number;
  format: 'mp3' | 'wav';
  audioFileId: string;
  audioUrl: string;
  duration: number; // in seconds
  provider: string;
  model: string;
  status: 'ready' | 'processing' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioStorageItem {
  id: string;
  buffer: Buffer;
  mimeType: string;
  filename: string;
  createdAt: number;
}

export interface PronunciationEntry {
  id: string;
  word: string;
  replacement: string;
  languageCode: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  type: 'general' | 'youtube' | 'podcast' | 'audiobook' | 'article';
  generationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSettings {
  maxFileSizeMb: number;
  maxFilesPerUpload: number;
  articleFetchTimeoutMs: number;
  characterLimitFree: number;
  characterLimitPro: number;
  enableGeminiTts: boolean;
  enableElevenlabs: boolean;
  enableAzureSpeech: boolean;
  enableOcrPrompt: boolean;
}

class MemoryStore {
  public generations: Map<string, GenerationRecord> = new Map();
  public audioFiles: Map<string, AudioStorageItem> = new Map();
  public pronunciations: Map<string, PronunciationEntry> = new Map();
  public projects: Map<string, ProjectRecord> = new Map();
  public logs: Array<{ id: string; timestamp: string; level: 'info' | 'warn' | 'error'; message: string; details?: any }> = [];

  public usage = {
    charactersUsed: 12450,
    audioMinutes: 14.8,
    generationCount: 18,
    planLimit: 100000,
    planTier: 'PRO',
  };

  public adminSettings: AdminSettings = {
    maxFileSizeMb: 25,
    maxFilesPerUpload: 10,
    articleFetchTimeoutMs: 10000,
    characterLimitFree: 10000,
    characterLimitPro: 100000,
    enableGeminiTts: true,
    enableElevenlabs: false,
    enableAzureSpeech: false,
    enableOcrPrompt: true,
  };

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed default projects
    const p1: ProjectRecord = {
      id: 'proj_yt_01',
      name: 'AI Tech Insights - YouTube Narration',
      description: 'Weekly tech explainer series and script voiceovers',
      type: 'youtube',
      generationCount: 2,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    };
    const p2: ProjectRecord = {
      id: 'proj_pod_01',
      name: 'The Synthesizer Podcast',
      description: 'Host and guest multi-speaker tech discourse',
      type: 'podcast',
      generationCount: 1,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    };
    this.projects.set(p1.id, p1);
    this.projects.set(p2.id, p2);

    // Seed sample pronunciations
    const pr1: PronunciationEntry = {
      id: 'pr_1',
      word: 'OpenAI',
      replacement: 'oh-pen-A-I',
      languageCode: 'en-US',
      createdAt: new Date().toISOString(),
    };
    const pr2: PronunciationEntry = {
      id: 'pr_2',
      word: 'VoxAI',
      replacement: 'Vawks A-I',
      languageCode: 'en-US',
      createdAt: new Date().toISOString(),
    };
    this.pronunciations.set(pr1.id, pr1);
    this.pronunciations.set(pr2.id, pr2);
  }

  public storeAudio(buffer: Buffer, mimeType: string, filename: string): string {
    const id = 'audio_' + crypto.randomBytes(8).toString('hex');
    this.audioFiles.set(id, {
      id,
      buffer,
      mimeType,
      filename,
      createdAt: Date.now(),
    });

    // Cleanup old audio buffers if memory exceeds 100 items (storage retention policy)
    if (this.audioFiles.size > 100) {
      const oldestKey = this.audioFiles.keys().next().value;
      if (oldestKey) this.audioFiles.delete(oldestKey);
    }

    return id;
  }

  public addLog(level: 'info' | 'warn' | 'error', message: string, details?: any) {
    this.logs.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
    });
    if (this.logs.length > 200) {
      this.logs.pop();
    }
  }
}

export const store = new MemoryStore();
