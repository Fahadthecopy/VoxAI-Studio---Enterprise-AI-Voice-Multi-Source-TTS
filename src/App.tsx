import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  FileText,
  UploadCloud,
  Link2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { MultiSourceInput } from './components/content/MultiSourceInput';
import { VoiceSelector } from './components/voice/VoiceSelector';
import { VoiceControls } from './components/voice/VoiceControls';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { PodcastStudio } from './components/modes/PodcastStudio';
import { YouTubeVoiceover } from './components/modes/YouTubeVoiceover';
import { GenerationHistory } from './components/history/GenerationHistory';
import { PronunciationDictionary } from './components/dictionary/PronunciationDictionary';
import { VoiceLibrary } from './components/voice/VoiceLibrary';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PricingModal } from './components/pricing/PricingModal';
import { VoiceProfile, GenerationRecord, ContentSourceType, PronunciationEntry } from './types';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('studio');

  // Multi-source content state
  const [sourceType, setSourceType] = useState<ContentSourceType>('text');
  const [text, setText] = useState<string>(
    'Artificial intelligence is dramatically reshaping audio design. VoxAI Studio translates your written scripts, uploaded multi-page documents, and live articles into expressive, emotionally fluent human speech.'
  );
  const [sourceMeta, setSourceMeta] = useState<{
    sourceName: string;
    sourceUrl?: string;
    originalFileName?: string;
  }>({
    sourceName: 'Text Editor',
  });

  // Voice Catalog State
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);

  // Voice Controls State
  const [emotion, setEmotion] = useState<string>('Natural');
  const [style, setStyle] = useState<string>('Narration');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3');

  // Generation & Audio Player State
  const [currentGeneration, setCurrentGeneration] = useState<GenerationRecord | null>(null);
  const [generationsList, setGenerationsList] = useState<GenerationRecord[]>([]);
  const [pronunciations, setPronunciations] = useState<PronunciationEntry[]>([]);
  const [usage, setUsage] = useState<any>(null);

  // Loading & Progress
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    async function init() {
      try {
        const [vList, gList, pList, uData] = await Promise.all([
          api.getVoices(),
          api.getGenerations(),
          api.getPronunciations(),
          api.getUsage(),
        ]);
        setVoices(vList);
        if (vList.length > 0) {
          setSelectedVoice(vList[0]);
        }
        setGenerationsList(gList);
        if (gList.length > 0) {
          setCurrentGeneration(gList[0]);
        }
        setPronunciations(pList);
        setUsage(uData.usage);
      } catch (err: any) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // Primary TTS Pipeline Execution
  const handleGenerateSpeech = async () => {
    if (!text.trim() || !selectedVoice) return;

    setGenerationError(null);
    setIsGenerating(true);

    const charCount = text.length;
    const estimatedChunks = Math.max(1, Math.ceil(charCount / 800));

    // Simulate multi-chunk step progress indicator for long documents
    if (estimatedChunks > 1) {
      setGenerationProgress({ current: 1, total: estimatedChunks });
    }

    try {
      if (estimatedChunks > 1) {
        const interval = setInterval(() => {
          setGenerationProgress(prev => {
            if (!prev) return null;
            if (prev.current < prev.total) {
              return { ...prev, current: prev.current + 1 };
            }
            return prev;
          });
        }, 500);

        setTimeout(() => clearInterval(interval), estimatedChunks * 500);
      }

      const res = await api.generateSpeech({
        text,
        voiceId: selectedVoice.id,
        language: selectedVoice.languageCode,
        emotion,
        style,
        speed,
        pitch,
        volume,
        format,
        sourceType,
        sourceName: sourceMeta.sourceName,
        sourceUrl: sourceMeta.sourceUrl,
        originalFileName: sourceMeta.originalFileName,
        title: sourceMeta.originalFileName || (text.slice(0, 36) + '...'),
      });

      // Construct record
      const newRecord: GenerationRecord = {
        id: res.generationId,
        title: sourceMeta.originalFileName || (text.slice(0, 36) + '...'),
        sourceType,
        sourceName: sourceMeta.sourceName,
        sourceUrl: sourceMeta.sourceUrl,
        originalFileName: sourceMeta.originalFileName,
        extractedText: text,
        characterCount: text.length,
        wordCount: res.wordCount,
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        language: selectedVoice.language,
        languageCode: selectedVoice.languageCode,
        emotion,
        style,
        speed,
        pitch,
        format,
        audioFileId: res.audioFileId,
        audioUrl: res.audioUrl,
        duration: res.duration,
        provider: res.provider,
        model: res.model,
        status: 'ready',
        createdAt: new Date().toISOString(),
      };

      setCurrentGeneration(newRecord);
      setGenerationsList(prev => [newRecord, ...prev]);

      // Refresh usage
      api.getUsage().then(u => setUsage(u.usage));

      // Scroll smoothly to player
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setGenerationError(err.message || 'Speech synthesis failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleLoadGenerationIntoStudio = (gen: GenerationRecord) => {
    setText(gen.extractedText || '');
    setSourceType(gen.sourceType);
    setSourceMeta({
      sourceName: gen.sourceName,
      sourceUrl: gen.sourceUrl,
      originalFileName: gen.originalFileName,
    });
    const foundVoice = voices.find(v => v.id === gen.voiceId);
    if (foundVoice) setSelectedVoice(foundVoice);
    setCurrentGeneration(gen);
    setCurrentTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteGeneration = async (id: string) => {
    try {
      await api.deleteGeneration(id);
      setGenerationsList(prev => prev.filter(g => g.id !== id));
      if (currentGeneration?.id === id) {
        setCurrentGeneration(null);
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Main Navbar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} usage={usage} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ============================================================== */}
        {/* TAB: TTS STUDIO                                                */}
        {/* ============================================================== */}
        {currentTab === 'studio' && (
          <div className="space-y-6">
            {/* AI Voice Studio Hero Banner */}
            <div className="text-center max-w-3xl mx-auto space-y-2 py-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Multi-Source Voice Synthesis</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                AI VOICE STUDIO
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Create natural, fluent AI speech from raw text, uploaded documents, or live web articles.
              </p>
            </div>

            {/* Error Notification */}
            {generationError && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Speech Generation Error</h4>
                  <p className="mt-0.5">{generationError}</p>
                </div>
              </div>
            )}

            {/* Progress Indicator for Long Documents */}
            {generationProgress && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-2 text-xs">
                <div className="flex justify-between items-center text-indigo-300 font-semibold">
                  <span>
                    Processing Section {generationProgress.current} of {generationProgress.total}...
                  </span>
                  <span>{Math.round((generationProgress.current / generationProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300"
                    style={{
                      width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* 1. MULTI-SOURCE INPUT SYSTEM */}
            <MultiSourceInput
              sourceType={sourceType}
              setSourceType={setSourceType}
              text={text}
              setText={setText}
              sourceMeta={sourceMeta}
              setSourceMeta={setSourceMeta}
              onGenerate={handleGenerateSpeech}
              isGenerating={isGenerating}
            />

            {/* 2. VOICE SELECTION */}
            {selectedVoice && (
              <VoiceSelector
                voices={voices}
                selectedVoice={selectedVoice}
                onSelectVoice={setSelectedVoice}
              />
            )}

            {/* 3. VOICE CONTROLS & GENERATE BUTTON */}
            {selectedVoice && (
              <VoiceControls
                voice={selectedVoice}
                emotion={emotion}
                setEmotion={setEmotion}
                style={style}
                setStyle={setStyle}
                speed={speed}
                setSpeed={setSpeed}
                pitch={pitch}
                setPitch={setPitch}
                volume={volume}
                setVolume={setVolume}
                format={format}
                setFormat={setFormat}
                onGenerate={handleGenerateSpeech}
                isGenerating={isGenerating}
                disabled={!text.trim()}
              />
            )}

            {/* 4. REAL-TIME AUDIO PLAYER */}
            <div id="audio-player-section">
              <AudioPlayer
                generation={currentGeneration}
                onRegenerate={handleGenerateSpeech}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB: YOUTUBE VOICEOVER                                         */}
        {/* ============================================================== */}
        {currentTab === 'youtube' && (
          <YouTubeVoiceover
            voices={voices}
            onVoiceoverGenerated={gen => {
              setCurrentGeneration(gen);
              setCurrentTab('studio');
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB: PODCAST STUDIO                                            */}
        {/* ============================================================== */}
        {currentTab === 'podcast' && (
          <PodcastStudio
            voices={voices}
            onPodcastGenerated={gen => {
              setCurrentGeneration(gen);
              setCurrentTab('studio');
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB: VOICE LIBRARY                                             */}
        {/* ============================================================== */}
        {currentTab === 'voices' && (
          <VoiceLibrary
            voices={voices}
            onSelectAndOpenStudio={v => {
              setSelectedVoice(v);
              setCurrentTab('studio');
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB: AUDIO HISTORY                                             */}
        {/* ============================================================== */}
        {currentTab === 'history' && (
          <GenerationHistory
            generations={generationsList}
            onPlay={gen => {
              setCurrentGeneration(gen);
              setCurrentTab('studio');
            }}
            onDelete={handleDeleteGeneration}
            onLoadIntoStudio={handleLoadGenerationIntoStudio}
          />
        )}

        {/* ============================================================== */}
        {/* TAB: PRONUNCIATION DICTIONARY                                  */}
        {/* ============================================================== */}
        {currentTab === 'pronunciation' && (
          <PronunciationDictionary
            entries={pronunciations}
            onAdd={entry => setPronunciations(prev => [entry, ...prev])}
            onDelete={async id => {
              await api.deletePronunciation(id);
              setPronunciations(prev => prev.filter(p => p.id !== id));
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB: PRICING & QUOTAS                                          */}
        {/* ============================================================== */}
        {currentTab === 'pricing' && <PricingModal />}

        {/* ============================================================== */}
        {/* TAB: ADMIN DASHBOARD                                           */}
        {/* ============================================================== */}
        {currentTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-300">VoxAI Studio</span>
            <span>•</span>
            <span>Enterprise Multi-Source AI Text-to-Speech Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              SSRF Guard Active
            </span>
            <span>•</span>
            <span className="text-slate-400">14+ Multilingual Accents</span>
            <span>•</span>
            <span>24 kHz Uncompressed PCM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
