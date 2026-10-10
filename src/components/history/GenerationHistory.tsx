import React, { useState } from 'react';
import {
  Clock,
  Play,
  Download,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Volume2,
  FileText,
  Link2,
  FileCode,
  RotateCcw,
} from 'lucide-react';
import { GenerationRecord, ContentSourceType } from '../../types';

interface GenerationHistoryProps {
  generations: GenerationRecord[];
  onPlay: (gen: GenerationRecord) => void;
  onDelete: (id: string) => void;
  onLoadIntoStudio: (gen: GenerationRecord) => void;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  generations,
  onPlay,
  onDelete,
  onLoadIntoStudio,
}) => {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');

  const filtered = generations.filter(g => {
    const matchesSearch =
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.voiceName.toLowerCase().includes(search.toLowerCase()) ||
      (g.sourceName && g.sourceName.toLowerCase().includes(search.toLowerCase()));

    const matchesSource = filterSource === 'all' || g.sourceType === filterSource;
    return matchesSearch && matchesSource;
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'Recently';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Generation History</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Access, download, and review all your previously synthesized audio files with source tracking.
          </p>
        </div>

        <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
          Total: {generations.length} records
        </span>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, voice, or source..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'text', label: '✍ Text' },
            { id: 'file', label: '📁 Files' },
            { id: 'article', label: '🔗 Articles' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterSource(btn.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                filterSource === btn.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          No matching generations found.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80">
          {filtered.map(item => (
            <div
              key={item.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-200 text-sm truncate max-w-md">
                    {item.title}
                  </h4>
                  {/* Source Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                      item.sourceType === 'article'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                        : item.sourceType === 'file'
                        ? 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.sourceType === 'article'
                      ? `Article (${item.sourceName || 'Web'})`
                      : item.sourceType === 'file'
                      ? `File (${item.originalFileName || item.sourceName || 'Doc'})`
                      : 'Text'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono text-[11px]">
                  <span className="text-indigo-400 font-semibold">{item.voiceName}</span>
                  <span>•</span>
                  <span>{item.language}</span>
                  <span>•</span>
                  <span>{item.characterCount?.toLocaleString()} chars</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{formatDuration(item.duration)}</span>
                  <span>•</span>
                  <span className="text-slate-500">{formatDate(item.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onPlay(item)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Play
                </button>

                <a
                  href={item.audioUrl}
                  download={`${item.voiceName}_speech.${item.format || 'wav'}`}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Download Audio"
                >
                  <Download className="w-4 h-4" />
                </a>

                <button
                  onClick={() => onLoadIntoStudio(item)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Open in Studio"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Delete generation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
