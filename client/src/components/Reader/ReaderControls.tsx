import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Bookmark,
  Sun,
  Moon,
  BookOpen,
  Home,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { Button, Modal } from '../common';
import type { ReadingMode, ReaderSettings, Bookmark as BookmarkType } from '../../types';

interface ReaderControlsProps {
  currentPage: number;
  totalPages: number;
  settings: ReaderSettings;
  bookmarks: BookmarkType[];
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  onAddBookmark: () => void;
  onRemoveBookmark: (id: string) => void;
  onGoToBookmark: (bookmark: BookmarkType) => void;
  onClose: () => void;
}

export function ReaderControls({
  currentPage,
  totalPages,
  settings,
  bookmarks,
  onNextPage,
  onPrevPage,
  onGoToPage,
  onSettingsChange,
  onAddBookmark,
  onRemoveBookmark,
  onGoToBookmark,
  onClose,
}: ReaderControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pageInput, setPageInput] = useState('');

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (page >= 1 && page <= totalPages) {
      onGoToPage(page);
      setPageInput('');
    }
  };

  const modeButtons: { mode: ReadingMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'day', icon: <Sun className="w-4 h-4" />, label: 'Day' },
    { mode: 'night', icon: <Moon className="w-4 h-4" />, label: 'Night' },
    { mode: 'sepia', icon: <BookOpen className="w-4 h-4" />, label: 'Sepia' },
  ];

  const isBookmarked = bookmarks.some((b) => b.page === currentPage);

  return (
    <>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddBookmark}
              className={isBookmarked ? 'text-yellow-400' : ''}
            >
              <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowBookmarks(true)}>
              <span className="text-sm">{bookmarks.length}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Side Navigation */}
      <button
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 md:p-4 text-white/50 hover:text-white/90 transition-colors disabled:opacity-20"
      >
        <ChevronLeft className="w-8 h-8 md:w-12 md:h-12" />
      </button>
      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 md:p-4 text-white/50 hover:text-white/90 transition-colors disabled:opacity-20"
      >
        <ChevronRight className="w-8 h-8 md:w-12 md:h-12" />
      </button>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/70 text-sm">
            Page {currentPage} of {totalPages}
          </span>

          <form onSubmit={handlePageSubmit} className="flex items-center gap-2">
            <input
              type="number"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder="Go to..."
              min={1}
              max={totalPages}
              className="w-20 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button variant="ghost" size="sm" type="submit">
              Go
            </Button>
          </form>

          <span className="text-white/70 text-sm">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Reader Settings">
        <div className="space-y-6">
          {/* Reading Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reading Mode
            </label>
            <div className="flex gap-2">
              {modeButtons.map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => onSettingsChange({ mode })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                    settings.mode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {icon}
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Size: {settings.fontSize}px
            </label>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSettingsChange({ fontSize: Math.max(12, settings.fontSize - 2) })}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <input
                type="range"
                min={12}
                max={24}
                value={settings.fontSize}
                onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value, 10) })}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSettingsChange({ fontSize: Math.min(24, settings.fontSize + 2) })}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Family
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onSettingsChange({ fontFamily: 'serif' })}
                className={`flex-1 py-2 rounded-lg font-serif transition-colors ${
                  settings.fontFamily === 'serif'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Serif
              </button>
              <button
                onClick={() => onSettingsChange({ fontFamily: 'sans' })}
                className={`flex-1 py-2 rounded-lg font-sans transition-colors ${
                  settings.fontFamily === 'sans'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Sans-serif
              </button>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Line Height: {settings.lineHeight}
            </label>
            <input
              type="range"
              min={1.2}
              max={2.4}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => onSettingsChange({ lineHeight: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        title="Bookmarks"
      >
        {bookmarks.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No bookmarks yet</p>
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((bookmark) => (
              <li
                key={bookmark.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
              >
                <button
                  onClick={() => {
                    onGoToBookmark(bookmark);
                    setShowBookmarks(false);
                  }}
                  className="flex-1 text-left"
                >
                  <span className="text-slate-100">Page {bookmark.page}</span>
                  {bookmark.note && (
                    <p className="text-sm text-slate-400 mt-1">{bookmark.note}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => onRemoveBookmark(bookmark.id)}
                  className="p-1 hover:bg-slate-600 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
