import {
  VoiceProfile,
  GenerationRecord,
  PronunciationEntry,
  ProjectRecord,
  AdminOverview,
  ExtractedArticleResult,
} from '../types';

export const api = {
  async getVoices(params?: { language?: string; gender?: string; provider?: string }): Promise<VoiceProfile[]> {
    const search = new URLSearchParams();
    if (params?.language) search.set('language', params.language);
    if (params?.gender) search.set('gender', params.gender);
    if (params?.provider) search.set('provider', params.provider);

    const res = await fetch(`/api/voices?${search.toString()}`);
    if (!res.ok) throw new Error('Failed to load voice catalog');
    const data = await res.json();
    return data.voices || [];
  },

  async extractFiles(files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    const res = await fetch('/api/content/extract-file', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to extract text from file');
    }
    return data;
  },

  async validateUrl(url: string): Promise<{ valid: boolean; error?: string }> {
    const res = await fetch('/api/content/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  async extractArticle(url: string): Promise<ExtractedArticleResult> {
    const res = await fetch('/api/content/extract-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to extract article content');
    }
    return data;
  },

  async generateSpeech(payload: {
    text: string;
    voiceId: string;
    language?: string;
    emotion?: string;
    style?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    format?: 'mp3' | 'wav';
    sourceType?: 'text' | 'file' | 'article';
    sourceName?: string;
    sourceUrl?: string;
    originalFileName?: string;
    projectId?: string;
    title?: string;
  }): Promise<any> {
    const res = await fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Voice generation failed');
    }
    return data;
  },

  async improveText(text: string, action: string): Promise<{ improvedText: string; originalLength: number; improvedLength: number }> {
    const res = await fetch('/api/tts/improve-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to improve text');
    }
    return data;
  },

  async getGenerations(): Promise<GenerationRecord[]> {
    const res = await fetch('/api/generations');
    const data = await res.json();
    return data.generations || [];
  },

  async deleteGeneration(id: string): Promise<void> {
    const res = await fetch(`/api/generations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete generation');
  },

  async getProjects(): Promise<ProjectRecord[]> {
    const res = await fetch('/api/projects');
    const data = await res.json();
    return data.projects || [];
  },

  async createProject(name: string, description?: string, type?: string): Promise<ProjectRecord> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, type }),
    });
    const data = await res.json();
    return data.project;
  },

  async getPronunciations(): Promise<PronunciationEntry[]> {
    const res = await fetch('/api/pronunciations');
    const data = await res.json();
    return data.dictionary || [];
  },

  async addPronunciation(word: string, replacement: string, languageCode = 'en-US'): Promise<PronunciationEntry> {
    const res = await fetch('/api/pronunciations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, replacement, languageCode }),
    });
    const data = await res.json();
    return data.entry;
  },

  async deletePronunciation(id: string): Promise<void> {
    await fetch(`/api/pronunciations/${id}`, { method: 'DELETE' });
  },

  async getUsage(): Promise<any> {
    const res = await fetch('/api/usage');
    return res.json();
  },

  async getPlans(): Promise<any> {
    const res = await fetch('/api/plans');
    return res.json();
  },

  async getAdminOverview(): Promise<AdminOverview> {
    const res = await fetch('/api/admin/overview');
    return res.json();
  },

  async updateAdminSettings(settings: any): Promise<any> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
