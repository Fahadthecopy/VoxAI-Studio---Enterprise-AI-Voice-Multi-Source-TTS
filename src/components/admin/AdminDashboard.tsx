import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  Settings,
  Activity,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
} from 'lucide-react';
import { AdminOverview } from '../../types';
import { api } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [maxFileSizeMb, setMaxFileSizeMb] = useState<number>(25);
  const [maxFilesPerUpload, setMaxFilesPerUpload] = useState<number>(10);
  const [articleFetchTimeoutMs, setArticleFetchTimeoutMs] = useState<number>(10000);
  const [enableGeminiTts, setEnableGeminiTts] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
      if (data.settings) {
        setMaxFileSizeMb(data.settings.maxFileSizeMb);
        setMaxFilesPerUpload(data.settings.maxFilesPerUpload);
        setArticleFetchTimeoutMs(data.settings.articleFetchTimeoutMs);
        setEnableGeminiTts(data.settings.enableGeminiTts);
      }
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateAdminSettings({
        maxFileSizeMb,
        maxFilesPerUpload,
        articleFetchTimeoutMs,
        enableGeminiTts,
      });
      alert('Admin settings updated successfully!');
      loadData();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Enterprise Administration & Security</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure upload quotas, SSRF boundaries, and inspect live TTS provider integrations.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      {/* Metrics Row */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Total Generations</span>
            <span className="text-2xl font-bold text-slate-100 mt-1 block">
              {overview.stats.totalGenerations}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Characters Synthesized</span>
            <span className="text-2xl font-bold text-indigo-400 mt-1 block">
              {overview.stats.charactersProcessed.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Active Audio Buffers</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {overview.stats.totalAudioBuffers}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Dictionary Overrides</span>
            <span className="text-2xl font-bold text-violet-400 mt-1 block">
              {overview.stats.totalPronunciations}
            </span>
          </div>
        </div>
      )}

      {/* Provider Connectivity & Health */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Server className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm">Connected TTS Engines & Providers</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {overview?.providers.map(provider => (
            <div
              key={provider.name}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-slate-200">{provider.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{provider.type}</p>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  provider.status.includes('Active')
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {provider.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Global Config Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Settings className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm">System Storage, Limits & Security</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Max Upload File Size (MB)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={maxFileSizeMb}
              onChange={e => setMaxFileSizeMb(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Configurable limit for PDF/DOCX/TXT/MD</p>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Max Files Per Multi-Upload</label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxFilesPerUpload}
              onChange={e => setMaxFilesPerUpload(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">Simultaneous documents in multi-file mode</p>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Article Fetch Timeout (ms)</label>
            <input
              type="number"
              min="2000"
              max="30000"
              step="1000"
              value={articleFetchTimeoutMs}
              onChange={e => setArticleFetchTimeoutMs(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">SSRF abort timeout for article extraction</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </form>

      {/* System Audit Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Activity className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm">System Audit & Extraction Log</h3>
        </div>

        <div className="bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-400 max-h-48 overflow-y-auto divide-y divide-slate-800/40">
          {overview?.logs && overview.logs.length > 0 ? (
            overview.logs.map(log => (
              <div key={log.id} className="py-1.5 flex items-start gap-2">
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold shrink-0 ${
                    log.level === 'error'
                      ? 'bg-red-500/20 text-red-300'
                      : log.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-slate-600">No logs recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
};
