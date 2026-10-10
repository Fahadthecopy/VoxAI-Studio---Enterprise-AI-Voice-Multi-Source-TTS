import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { PronunciationEntry } from '../../types';
import { api } from '../../services/api';

interface PronunciationDictionaryProps {
  entries: PronunciationEntry[];
  onAdd: (entry: PronunciationEntry) => void;
  onDelete: (id: string) => void;
}

export const PronunciationDictionary: React.FC<PronunciationDictionaryProps> = ({
  entries,
  onAdd,
  onDelete,
}) => {
  const [word, setWord] = useState('');
  const [replacement, setReplacement] = useState('');
  const [languageCode, setLanguageCode] = useState('en-US');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !replacement.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await api.addPronunciation(word.trim(), replacement.trim(), languageCode);
      onAdd(created);
      setWord('');
      setReplacement('');
    } catch (err: any) {
      alert(`Failed to add pronunciation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Pronunciation Dictionary</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ensure technical terms, company names, and foreign acronyms are pronounced with exact phonetic accuracy.
          </p>
        </div>
      </div>

      {/* Add new rule form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
          Add Phonetic Override
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Original Word / Acronym</label>
            <input
              type="text"
              value={word}
              onChange={e => setWord(e.target.value)}
              placeholder="e.g. OpenAI"
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Spoken Replacement / Phonetics</label>
            <input
              type="text"
              value={replacement}
              onChange={e => setReplacement(e.target.value)}
              placeholder="e.g. oh-pen-A-I"
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Language</label>
            <select
              value={languageCode}
              onChange={e => setLanguageCode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
            >
              <option value="en-US">English (US)</option>
              <option value="hi-IN">Hindi (India)</option>
              <option value="ur-PK">Urdu (Pakistan)</option>
              <option value="es-ES">Spanish (Spain)</option>
              <option value="fr-FR">French (France)</option>
              <option value="de-DE">German (Germany)</option>
              <option value="ar-SA">Arabic (Saudi)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !word.trim() || !replacement.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </div>
      </form>

      {/* Rules list */}
      <div className="space-y-3">
        <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
          Active Dictionary Overrides ({entries.length})
        </h4>

        {entries.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            No custom pronunciations configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entries.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{item.word}</span>
                    <span className="text-slate-500">➔</span>
                    <span className="font-mono text-indigo-400 font-semibold">{item.replacement}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{item.languageCode}</span>
                </div>

                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  title="Remove rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
