import * as Popover from '@radix-ui/react-popover';
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
  return (
    <Popover.Root open={true}>
      {/* Virtual anchor positioned at cursor coordinates */}
      <Popover.Anchor
        style={{ position: 'fixed', left: x, top: y, width: 0, height: 0, pointerEvents: 'none' }}
      />
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="center"
          avoidCollisions
          collisionPadding={8}
          onPointerDownOutside={onClose}
          onEscapeKeyDown={onClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[100] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 w-[280px] focus:outline-none"
          role="dialog"
          aria-label={`Dictionary: ${word}`}
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
