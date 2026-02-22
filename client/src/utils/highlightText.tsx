import React from 'react';
import type { Highlight } from '../types';

export interface RangeHighlight {
  startChar: number;
  endChar: number;
  color: string;
  id: string;
}

/**
 * Splits `text` into interleaved plain-text <span>s and highlighted <mark>s.
 * Ranges must not overlap; if they do, the first one wins.
 *
 * @param text          The full page text string
 * @param highlights    Stored highlights for this page
 * @param searchMatch   Optional single search-match range (shown in a distinct highlight)
 * @param ttsWordRange  Optional {start, end} character range for the TTS current word
 */
export function renderWithHighlights(
  text: string,
  highlights: Highlight[],
  searchMatch?: { startChar: number; endChar: number } | null,
  ttsWordRange?: { start: number; end: number } | null
): React.ReactNode {
  if (!text) return null;

  // Build an array of tagged ranges, sorted by startChar
  const ranges: Array<{
    startChar: number;
    endChar: number;
    color: string;
    className: string;
    id: string;
  }> = [];

  for (const h of highlights) {
    ranges.push({
      startChar: h.startChar,
      endChar: h.endChar,
      color: h.color,
      className: 'reader-highlight',
      id: `hl-${h.id}`,
    });
  }

  if (searchMatch) {
    ranges.push({
      startChar: searchMatch.startChar,
      endChar: searchMatch.endChar,
      color: '#fef08a',
      className: 'reader-search-match',
      id: 'search-match',
    });
  }

  if (ttsWordRange) {
    ranges.push({
      startChar: ttsWordRange.start,
      endChar: ttsWordRange.end,
      color: '#fde68a',
      className: 'reader-tts-word',
      id: 'tts-word',
    });
  }

  if (ranges.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  // Sort by start, then end (longer first for ties)
  ranges.sort((a, b) => a.startChar - b.startChar || b.endChar - a.endChar);

  // Merge / de-overlap: each character belongs to at most one range
  const merged: typeof ranges = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.startChar >= text.length) continue;
    const start = Math.max(r.startChar, cursor);
    const end = Math.min(r.endChar, text.length);
    if (start >= end) continue;
    merged.push({ ...r, startChar: start, endChar: end });
    cursor = end;
  }

  const nodes: React.ReactNode[] = [];
  let pos = 0;

  for (const r of merged) {
    if (pos < r.startChar) {
      nodes.push(
        <span key={`plain-${pos}`}>{text.slice(pos, r.startChar)}</span>
      );
    }
    nodes.push(
      <mark
        key={r.id}
        className={r.className}
        style={{ backgroundColor: r.color, borderRadius: '2px', padding: '0 1px' }}
      >
        {text.slice(r.startChar, r.endChar)}
      </mark>
    );
    pos = r.endChar;
  }

  if (pos < text.length) {
    nodes.push(<span key={`plain-end`}>{text.slice(pos)}</span>);
  }

  return <span className="whitespace-pre-wrap">{nodes}</span>;
}
