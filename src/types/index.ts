export type ContentSourceType = 'text' | 'file' | 'article';

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  language: string;
  languageCode: string;
  country: string;
  accent: string;
  provider: 'gemini' | 'google' | 'elevenlabs' | 'azure' | 'voxai';
  providerVoiceName?: string;
  description: string;
  sampleText: string;
  ageGroup: 'young' | 'middle-aged' | 'senior';
  useCases: string[];
  supportedEmotions: string[];
  supportedStyles: string[];
  isPremium: boolean;
}

export interface ExtractedFileItem {
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

export interface ExtractedArticleResult {
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

export interface GenerationRecord {
  id: string;
  projectId?: string;
  title: string;
  sourceType: ContentSourceType;
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
  duration: number;
  provider: string;
  model: string;
  status: 'ready' | 'processing' | 'failed';
  createdAt: string;
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

export interface AdminOverview {
  settings: {
    maxFileSizeMb: number;
    maxFilesPerUpload: number;
    articleFetchTimeoutMs: number;
    characterLimitFree: number;
    characterLimitPro: number;
    enableGeminiTts: boolean;
    enableElevenlabs: boolean;
    enableAzureSpeech: boolean;
    enableOcrPrompt: boolean;
  };
  stats: {
    totalGenerations: number;
    totalAudioBuffers: number;
    totalProjects: number;
    totalPronunciations: number;
    charactersProcessed: number;
    logsCount: number;
  };
  logs: Array<{ id: string; timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>;
  providers: Array<{ name: string; status: string; type: string; model?: string }>;
}
