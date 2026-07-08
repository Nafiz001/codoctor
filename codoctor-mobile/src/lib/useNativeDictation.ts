// Streaming Bangla dictation using the phone's native speech recognizer
// (Android → Google `bn-BD`, the SAME engine the web app's Web Speech API uses;
// iOS → Speech framework). Continuous, real-time, natural-pause segmentation —
// no fixed chunks, no upload gaps, no Whisper. Requires a DEV BUILD (not Expo Go).
//
// Drop-in replacement for useChunkedRecording: same { state, start, stop } shape.

import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

interface Options {
  onTranscript: (text: string, conf: number) => void;
  onError?: (message: string) => void;
  language?: string;
  /** Bias terms — clinical / drug words to help the recognizer. */
  contextualStrings?: string[];
}

export function useNativeDictation({
  onTranscript,
  onError,
  language = 'bn-BD',
  contextualStrings,
}: Options) {
  const [state, setState] = useState<RecordingState>('idle');
  const activeRef = useRef(false);
  const props = useRef({ onTranscript, onError, language, contextualStrings });
  props.current = { onTranscript, onError, language, contextualStrings };

  const begin = () => {
    ExpoSpeechRecognitionModule.start({
      lang: props.current.language,
      interimResults: true,
      continuous: true,
      contextualStrings: props.current.contextualStrings,
      addsPunctuation: true,
    });
  };

  // Emit each finalized utterance to the caller.
  useSpeechRecognitionEvent('result', (event) => {
    const res = event.results?.[0];
    if (!res || !event.isFinal) return;
    const text = (res.transcript || '').trim();
    if (text) {
      const conf = res.confidence != null && res.confidence > 0 ? res.confidence : 0.9;
      props.current.onTranscript(text, conf);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    // Transient silence: keep listening rather than surfacing an error.
    if ((event.error === 'speech-timeout' || event.error === 'no-speech') && activeRef.current) {
      try { begin(); } catch { /* will retry on next end */ }
      return;
    }
    if (!activeRef.current) return;
    activeRef.current = false;
    setState('error');
    props.current.onError?.(event.message || String(event.error));
  });

  // Some platforms end a session after a final result; restart to stay continuous.
  useSpeechRecognitionEvent('end', () => {
    if (activeRef.current) {
      try { begin(); } catch { /* ignore */ }
    } else {
      setState('idle');
    }
  });

  const start = useCallback(async () => {
    if (activeRef.current) return;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setState('error');
      props.current.onError?.('Microphone / speech-recognition permission denied.');
      return;
    }
    activeRef.current = true;
    setState('recording');
    try {
      begin();
    } catch (e) {
      activeRef.current = false;
      setState('error');
      props.current.onError?.(`Could not start recognition: ${(e as Error).message}`);
    }
  }, []);

  const stop = useCallback(async () => {
    activeRef.current = false;
    try { ExpoSpeechRecognitionModule.stop(); } catch { /* ignore */ }
    setState('idle');
  }, []);

  return { state, start, stop };
}
