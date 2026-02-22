import { useEffect, useRef } from 'react';
import { X, BookOpen, Loader2 } from 'lucide-react';

interface DictionaryPopupProps {
  word: string;
  entry: {
    word: string;
    phonetic?: string;
    meanings: { partOfSpeech: string; definitions: { definition: string }[] }[];
  } | null;
  isLoading: boolean;
  error: string | null;
  x: number;
  y: number;
  onClose: () => void;
}

export function DictionaryPopup({ word, entry, isLoading, error, x, y, onClose }: DictionaryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Dismiss on outside click or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Position popup: keep within viewport
  const POPUP_WIDTH = 280;
  const POPUP_APPROX_HEIGHT = 160;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(x - POPUP_WIDTH / 2, 8), vw - POPUP_WIDTH - 8);
  // Show below selection if there's room, otherwise above
  const top = y + 12 + POPUP_APPROX_HEIGHT < vh ? y + 12 : y - POPUP_APPROX_HEIGHT - 12;

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Dictionary: ${word}`}
      className="fixed z-[100] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4"
      style={{ left, top, width: POPUP_WIDTH }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span className="font-bold text-slate-100 capitalize">{word}</span>
          {entry?.phonetic && <span className="text-slate-400 text-sm">{entry.phonetic}</span>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close dictionary popup"
          className="p-0.5 text-slate-400 hover:text-slate-200 flex-shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span className="text-sm">Looking up…</span>
        </div>
      )}

      {error && !isLoading && (
        <p className="text-slate-400 text-sm py-1">{error}</p>
      )}

      {entry && !isLoading && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {entry.meanings.slice(0, 3).map((meaning, i) => (
            <div key={i}>
              <span className="text-xs font-medium text-blue-400 italic">{meaning.partOfSpeech}</span>
              <p className="text-sm text-slate-200 mt-0.5 leading-snug">
                {meaning.definitions[0]?.definition}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
