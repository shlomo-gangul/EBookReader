import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'bookreader_tts_settings';

export interface TTSSettings {
  rate: number;
  pitch: number;
  voiceUri: string;
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  ttsWordRange: { start: number; end: number } | null;
  settings: TTSSettings;
  voices: SpeechSynthesisVoice[];
}

export interface TTSActions {
  play: (text: string, onEnd?: () => void) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVoice: (voiceUri: string) => void;
}

function loadSettings(): TTSSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { rate: 1, pitch: 1, voiceUri: '' };
}

function saveSettings(s: TTSSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useTextToSpeech(): TTSState & TTSActions {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsWordRange, setTtsWordRange] = useState<{ start: number; end: number } | null>(null);
  const [settings, setSettings] = useState<TTSSettings>(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);

  // Load voices (async on some browsers)
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() ?? [];
      if (v.length > 0) setVoices(v);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
    setTtsWordRange(null);
  }, []);

  const play = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      onEndRef.current = onEnd ?? null;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      if (settings.voiceUri) {
        const voice = window.speechSynthesis.getVoices().find(
          (v) => v.voiceURI === settings.voiceUri
        );
        if (voice) utterance.voice = voice;
      }

      utterance.onboundary = (e) => {
        if (e.name === 'word') {
          setTtsWordRange({ start: e.charIndex, end: e.charIndex + (e.charLength ?? 5) });
        }
      };

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setTtsWordRange(null);
        utteranceRef.current = null;
        onEndRef.current?.();
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setTtsWordRange(null);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [settings]
  );

  const pause = useCallback(() => {
    window.speechSynthesis?.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis?.resume();
    setIsPaused(false);
    setIsPlaying(true);
  }, []);

  const setRate = useCallback((rate: number) => {
    setSettings((prev) => {
      const next = { ...prev, rate };
      saveSettings(next);
      return next;
    });
  }, []);

  const setPitch = useCallback((pitch: number) => {
    setSettings((prev) => {
      const next = { ...prev, pitch };
      saveSettings(next);
      return next;
    });
  }, []);

  const setVoice = useCallback((voiceUri: string) => {
    setSettings((prev) => {
      const next = { ...prev, voiceUri };
      saveSettings(next);
      return next;
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    isPlaying,
    isPaused,
    ttsWordRange,
    settings,
    voices,
    play,
    pause,
    resume,
    stop,
    setRate,
    setPitch,
    setVoice,
  };
}
