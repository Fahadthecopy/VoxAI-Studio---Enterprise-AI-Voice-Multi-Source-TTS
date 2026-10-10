import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Link2,
  Trash2,
  Wand2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileUp,
  Download,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Loader2,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { ContentSourceType, ExtractedFileItem, ExtractedArticleResult } from '../../types';
import { api } from '../../services/api';

interface MultiSourceInputProps {
  sourceType: ContentSourceType;
  setSourceType: (type: ContentSourceType) => void;
  text: string;
  setText: (text: string) => void;
  sourceMeta: {
    sourceName: string;
    sourceUrl?: string;
    originalFileName?: string;
  };
  setSourceMeta: React.Dispatch<
    React.SetStateAction<{
      sourceName: string;
      sourceUrl?: string;
      originalFileName?: string;
    }>
  >;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const MultiSourceInput: React.FC<MultiSourceInputProps> = ({
  sourceType,
  setSourceType,
  text,
  setText,
  sourceMeta,
  setSourceMeta,
  onGenerate,
  isGenerating,
}) => {
  // Draft auto-save state
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string>('');
  const [showImproveModal, setShowImproveModal] = useState<boolean>(false);
  const [improvingAction, setImprovingAction] = useState<string | null>(null);
  const [originalBackup, setOriginalBackup] = useState<string | null>(null);

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<ExtractedFileItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ExtractedFileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Article Link State
  const [articleUrl, setArticleUrl] = useState<string>('');
  const [isFetchingArticle, setIsFetchingArticle] = useState<boolean>(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [articleResult, setArticleResult] = useState<ExtractedArticleResult | null>(null);

  // Editor mode: is user editing the imported content
  const [isEditingExtracted, setIsEditingExtracted] = useState<boolean>(true);

  // Check saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voxai_draft_text');
      const time = localStorage.getItem('voxai_draft_time');
      if (saved && saved.trim().length > 0 && saved !== text) {
        setHasDraft(true);
        setDraftSavedAt(time || 'earlier today');
      }
    } catch (_) {}
  }, []);

  // Auto-save draft on text change
  useEffect(() => {
    if (text && text.trim().length > 0 && sourceType === 'text') {
      const timeout = setTimeout(() => {
        try {
          localStorage.setItem('voxai_draft_text', text);
          localStorage.setItem('voxai_draft_time', new Date().toLocaleTimeString());
        } catch (_) {}
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [text, sourceType]);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem('voxai_draft_text');
      if (saved) {
        setText(saved);
        setHasDraft(false);
      }
    } catch (_) {}
  };

  const clearText = () => {
    if (text.trim().length > 0 && confirm('Are you sure you want to clear all text?')) {
      setOriginalBackup(text);
      setText('');
      setUploadedFiles([]);
      setArticleResult(null);
      setSourceMeta({ sourceName: 'Text Editor' });
      try {
        localStorage.removeItem('voxai_draft_text');
      } catch (_) {}
    }
  };

  // Content Statistics calculations
  const characters = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+/).filter(Boolean).length;
  const paragraphs = text.split(/\n+/).filter(Boolean).length;
  const estimatedSeconds = Math.max(0, Math.round((words / 150) * 60));
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // FILE UPLOAD HANDLERS
  // -------------------------------------------------------------
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setFileError(null);
    setIsUploading(true);

    try {
      const fileArr = Array.from(files);
      const data = await api.extractFiles(fileArr);

      if (data.sourceType === 'file' && data.files) {
        // Multi-file response
        setUploadedFiles(data.files);
        setText(data.combined.text);
        setSourceMeta({
          sourceName: `${data.files.length} Imported Documents`,
          originalFileName: data.files.map((f: any) => f.fileName).join(', '),
        });
      } else if (data.text) {
        // Single file response
        setUploadedFiles([data]);
        setText(data.text);
        setSourceMeta({
          sourceName: data.fileName,
          originalFileName: data.fileName,
        });
      }
      setIsEditingExtracted(true);
    } catch (err: any) {
      setFileError(
        err.message || 'This file could not be processed. Please verify that the file is supported and not corrupted.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const reorderFile = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= uploadedFiles.length) return;

    const updated = [...uploadedFiles];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);

    setUploadedFiles(updated);
    // Re-combine text in the new order
    const combined = updated.map(f => `--- ${f.fileName} ---\n\n${f.text}`).join('\n\n');
    setText(combined);
  };

  const removeFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    if (updated.length === 0) {
      setText('');
      setSourceMeta({ sourceName: 'Text Editor' });
    } else {
      const combined = updated.map(f => `--- ${f.fileName} ---\n\n${f.text}`).join('\n\n');
      setText(combined);
    }
  };

  // -------------------------------------------------------------
  // ARTICLE LINK HANDLERS
  // -------------------------------------------------------------
  const handleFetchArticle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!articleUrl.trim()) {
      setArticleError('Please enter a valid HTTP or HTTPS article URL.');
      return;
    }

    setArticleError(null);
    setIsFetchingArticle(true);

    try {
      const res = await api.extractArticle(articleUrl.trim());
      if (res.success && res.text) {
        setArticleResult(res);
        setText(res.text);
        setSourceMeta({
          sourceName: res.domain || 'Article URL',
          sourceUrl: res.url,
        });
        setIsEditingExtracted(true);
      } else {
        setArticleError(
          res.error ||
            "We couldn't extract readable article content. Try another URL or paste the article text manually."
        );
      }
    } catch (err: any) {
      setArticleError(
        err.message ||
          "We couldn't access this article. The website may block automated access or require authentication. Try copying the article text into Text mode or upload the article as a supported file."
      );
    } finally {
      setIsFetchingArticle(false);
    }
  };

  // -------------------------------------------------------------
  // AI TEXT IMPROVEMENT HANDLERS
  // -------------------------------------------------------------
  const handleImproveText = async (action: string) => {
    if (!text.trim()) return;
    setImprovingAction(action);
    setOriginalBackup(text);

    try {
      const res = await api.improveText(text, action);
      if (res.improvedText) {
        setText(res.improvedText);
        setShowImproveModal(false);
      }
    } catch (err: any) {
      alert(`Improvement failed: ${err.message}`);
    } finally {
      setImprovingAction(null);
    }
  };

  const revertImprovement = () => {
    if (originalBackup) {
      setText(originalBackup);
      setOriginalBackup(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* 1. TOP SEGMENTED CONTROL: INPUT MODE SELECTOR */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Content Source</span>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            Select Input Method
          </h2>
        </div>

        {/* The 3 Prominent Options */}
        <div
          role="tablist"
          aria-label="Content input source"
          className="inline-flex p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner w-full sm:w-auto"
        >
          <button
            role="tab"
            aria-selected={sourceType === 'text'}
            onClick={() => {
              setSourceType('text');
              if (uploadedFiles.length === 0 && !articleResult) {
                setSourceMeta({ sourceName: 'Text Editor' });
              }
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
              sourceType === 'text'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>✍</span>
            <span>Text</span>
          </button>

          <button
            role="tab"
            aria-selected={sourceType === 'file'}
            onClick={() => setSourceType('file')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
              sourceType === 'file'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>File Uploads</span>
            {uploadedFiles.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-bold">
                {uploadedFiles.length}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={sourceType === 'article'}
            onClick={() => setSourceType('article')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
              sourceType === 'article'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Article Link</span>
            {articleResult && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* 2. SOURCE-SPECIFIC TOP PANEL */}
      <div className="p-4 sm:p-6 bg-slate-900/40 border-b border-slate-800/80">
        {/* ======================= MODE: TEXT ======================= */}
        {sourceType === 'text' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">
                Direct Text Input & Script Editor
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Type, paste, or format any script or document
              </span>
            </div>

            {hasDraft && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Unsaved draft found from {draftSavedAt}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={restoreDraft}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                  >
                    Restore Draft
                  </button>
                  <button
                    onClick={() => setHasDraft(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= MODE: FILE UPLOADS ======================= */}
        {sourceType === 'file' && (
          <div className="space-y-4">
            {/* Drag & Drop Box */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-xl p-6 sm:p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-indigo-950/10 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.docx,.rtf,.md"
                className="hidden"
                onChange={e => e.target.files && handleFileUpload(e.target.files)}
              />

              <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center mx-auto mb-3 transition-colors">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-slate-200 mb-1">
                {isUploading ? 'Validating and Extracting Text...' : 'Upload Your File(s)'}
              </h3>
              <p className="text-xs text-slate-400 mb-2">
                Drag & drop your files here or{' '}
                <span className="text-indigo-400 font-semibold underline underline-offset-2">
                  Browse Files
                </span>
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/70 text-[11px] text-slate-400 border border-slate-700/50">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>TXT • PDF • DOCX • RTF • MD</span>
                <span className="text-slate-600">•</span>
                <span>Max 25 MB</span>
              </div>
            </div>

            {/* Error Message for Files */}
            {fileError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{fileError}</p>
                  {fileError.includes('OCR') && (
                    <button
                      onClick={() => alert('OCR engine is disabled in standard tier. Please select selectable-text PDFs or copy text directly.')}
                      className="mt-1.5 px-2.5 py-1 rounded bg-red-800/60 hover:bg-red-800 text-white font-medium inline-flex items-center gap-1.5"
                    >
                      Extract Text with OCR (Preview)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Uploaded Files Table / List */}
            {uploadedFiles.length > 0 && (
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Uploaded Files ({uploadedFiles.length})
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                  >
                    <FileUp className="w-3.5 h-3.5" /> + Add Another File
                  </button>
                </div>

                <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={file.fileName + idx}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-slate-200 truncate">{file.fileName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {file.fileType.toUpperCase()} • {file.characters?.toLocaleString()} chars •{' '}
                            {file.words?.toLocaleString()} words
                            {file.pages ? ` • ${file.pages} pages` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Order buttons if multiple */}
                        {uploadedFiles.length > 1 && (
                          <div className="flex items-center">
                            <button
                              disabled={idx === 0}
                              onClick={() => reorderFile(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === uploadedFiles.length - 1}
                              onClick={() => reorderFile(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setPreviewFile(file)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>

                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= MODE: ARTICLE LINK ======================= */}
        {sourceType === 'article' && (
          <div className="space-y-4">
            <form onSubmit={handleFetchArticle} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                🔗 Article URL
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={articleUrl}
                    onChange={e => setArticleUrl(e.target.value)}
                    placeholder="https://example.com/news/artificial-intelligence"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors"
                  />
                  <div className="absolute right-3 top-2.5 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> SSRF Protected
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isFetchingArticle || !articleUrl.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
                >
                  {isFetchingArticle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching & Cleaning...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      <span>Fetch Article</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Paste any news, blog, or research link. VoxAI strips headers, footers, ads, and cookie notices,
                leaving pristine narrative text.
              </p>
            </form>

            {/* Error Message for Article */}
            {articleError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{articleError}</p>
                  <p className="text-[11px] text-red-400/80 mt-1">
                    Try another article URL, paste the article text manually in Text mode, or upload it as a file.
                  </p>
                </div>
              </div>
            )}

            {/* Article Extraction Result Card */}
            {articleResult && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-emerald-400 uppercase tracking-wide text-[11px]">
                      Article Imported Successfully
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {articleResult.domain}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{articleResult.title}</h4>
                  {articleResult.author && (
                    <p className="text-[11px] text-slate-400 mt-0.5">By {articleResult.author}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Characters</span>
                    <span className="font-bold text-slate-200">
                      {articleResult.characters.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Words</span>
                    <span className="font-bold text-slate-200">
                      {articleResult.words.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Paragraphs</span>
                    <span className="font-bold text-slate-200">{articleResult.paragraphs}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Est. Duration</span>
                    <span className="font-bold text-emerald-400">
                      {formatDuration(articleResult.estimatedDurationSeconds)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setArticleResult(null);
                      setArticleUrl('');
                      setText('');
                    }}
                    className="text-slate-400 hover:text-slate-200 text-xs inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Fetch Another URL
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(text);
                      alert('Article text copied to clipboard!');
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" /> Copy Text
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. UNIFIED CONTENT EDITOR & PREVIEW AREA */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-4">
        {/* Source Badge Bar */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Source:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5">
              {sourceType === 'text' && <span>✍ Direct Text</span>}
              {sourceType === 'file' && (
                <span>
                  📁 {sourceMeta.originalFileName ? sourceMeta.originalFileName.slice(0, 30) : 'Uploaded File'}
                </span>
              )}
              {sourceType === 'article' && (
                <span>🔗 Article ({sourceMeta.sourceName})</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {originalBackup && (
              <button
                onClick={revertImprovement}
                className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 font-medium"
                title="Restore previous text before AI improvement"
              >
                <RotateCcw className="w-3 h-3" /> Revert AI Polish
              </button>
            )}

            <button
              onClick={() => setShowImproveModal(true)}
              disabled={!text.trim()}
              className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Wand2 className="w-3.5 h-3.5" /> Improve Text
            </button>

            <button
              onClick={clearText}
              disabled={!text.trim()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors disabled:opacity-30"
              title="Clear all text"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Text Area / Editor */}
        <div className="flex-1 relative min-h-[220px]">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              sourceType === 'text'
                ? 'Write or paste your text here...\nYour text will be converted into natural AI speech.'
                : sourceType === 'file'
                ? 'Extracted document text will appear here. You can edit and format it prior to voice generation.'
                : 'Extracted article content will appear here. Edit or trim paragraphs before generating audio.'
            }
            className="w-full h-full min-h-[220px] bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 rounded-xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 outline-none resize-y leading-relaxed font-sans transition-colors"
          />
        </div>

        {/* 4. STATISTICS COUNTER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] sm:text-xs">
            <div>
              <span className="text-slate-500">Characters: </span>
              <span className="font-semibold text-slate-200">{characters.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Words: </span>
              <span className="font-semibold text-slate-200">{words.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Sentences: </span>
              <span className="font-semibold text-slate-200">{sentences}</span>
            </div>
            <div>
              <span className="text-slate-500">Paragraphs: </span>
              <span className="font-semibold text-slate-200">{paragraphs}</span>
            </div>
            <div className="text-indigo-400">
              <span className="text-slate-500">Est. Audio Duration: </span>
              <span className="font-bold">{formatDuration(estimatedSeconds)}</span>
            </div>
          </div>

          {/* Quick chunking indicator if content is long */}
          {characters > 800 && (
            <div className="text-[11px] px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/40">
              Auto-divided into ~{Math.ceil(characters / 800)} safe sections
            </div>
          )}
        </div>
      </div>

      {/* MODAL: AI IMPROVE TEXT */}
      {showImproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-slate-100 text-base">Enhance Speech Script</h3>
              </div>
              <button
                onClick={() => setShowImproveModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select how you would like Gemini AI to refine your narration script. Your original text can be
              reverted at any time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { id: 'improve_script', label: 'Improve Spoken Flow', desc: 'Optimize pauses and speech cadence' },
                { id: 'fix_grammar', label: 'Fix Grammar & Typos', desc: 'Correct punctuation & spelling errors' },
                { id: 'more_natural', label: 'Make More Natural', desc: 'Lifelike conversational inflections' },
                { id: 'more_professional', label: 'Executive / Corporate', desc: 'Authoritative, polished tone' },
                { id: 'conversational', label: 'Casual Podcast Style', desc: 'Warm and friendly tone' },
                { id: 'create_narration', label: 'Documentary Narration', desc: 'Cinematic pacing and dramatic build' },
                { id: 'create_youtube_script', label: 'YouTube Retention Script', desc: 'Engaging hook and clear flow' },
                { id: 'summarize', label: 'Summarize Script', desc: 'Condense into high-impact summary' },
              ].map(opt => (
                <button
                  key={opt.id}
                  disabled={improvingAction !== null}
                  onClick={() => handleImproveText(opt.id)}
                  className="text-left p-3 rounded-xl bg-slate-950 hover:bg-violet-950/40 border border-slate-800 hover:border-violet-500/40 transition-all flex flex-col justify-between group disabled:opacity-50"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-violet-300">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">{opt.desc}</span>
                </button>
              ))}
            </div>

            {improvingAction && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-violet-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transforming script with Gemini...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW INDIVIDUAL FILE */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">{previewFile.fileName}</h3>
                <span className="text-[11px] text-slate-400">
                  {previewFile.characters.toLocaleString()} chars • {previewFile.words.toLocaleString()} words
                </span>
              </div>
              <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
              {previewFile.text}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setText(previewFile.text);
                  setPreviewFile(null);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
              >
                Use Only This File's Text
              </button>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
