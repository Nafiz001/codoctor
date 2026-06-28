import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  IOSOutputFormat,
  AudioQuality,
  type RecordingOptions,
} from 'expo-audio';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

interface UseRecordingOptions {
  onTranscript: (text: string, conf: number) => void;
  onError?: (message: string) => void;
  chunkDurationMs?: number;
  transcribeUrl: string;
  language?: string;
}

const RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

export function useChunkedRecording({
  onTranscript,
  onError,
  chunkDurationMs = 8000,
  transcribeUrl,
  language = 'bn',
}: UseRecordingOptions) {
  const [state, setState] = useState<RecordingState>('idle');
  const activeRef = useRef(false);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest prop values accessible inside async callbacks without re-creating them
  const propsRef = useRef({ onTranscript, onError, transcribeUrl, language, chunkDurationMs });
  useEffect(() => {
    propsRef.current = { onTranscript, onError, transcribeUrl, language, chunkDurationMs };
  });

  const recorder = useAudioRecorder(RECORDING_OPTIONS);

  // Runs one 8-second recording chunk, uploads, then recurses
  const runChunk = useCallback(async (): Promise<void> => {
    if (!activeRef.current) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: unknown) {
      activeRef.current = false;
      setState('error');
      propsRef.current.onError?.(`Microphone error: ${(e as Error).message}`);
      return;
    }

    chunkTimerRef.current = setTimeout(async () => {
      if (!activeRef.current) return;

      setState('processing');
      try {
        await recorder.stop();
      } catch {}

      const uri = recorder.uri;
      if (uri) {
        const { transcribeUrl: url, language: lang, onTranscript: cb, onError: errCb } =
          propsRef.current;
        try {
          const body = new FormData();
          const filename = uri.split('/').pop() ?? 'chunk.m4a';
          body.append('file', { uri, name: filename, type: 'audio/m4a' } as unknown as Blob);
          body.append('language', lang);

          const res = await fetch(url, { method: 'POST', body });
          if (res.ok) {
            const data = (await res.json()) as { text: string; conf: number };
            if (data.text?.trim()) cb(data.text.trim(), data.conf ?? 0.85);
          } else {
            const err = await res.json().catch(() => ({}));
            const detail = (err as { detail?: string }).detail ?? `HTTP ${res.status}`;
            errCb?.(`Transcription failed: ${detail}`);
          }
        } catch (e: unknown) {
          propsRef.current.onError?.(`Network error: ${(e as Error).message}`);
        }
      }

      if (activeRef.current) {
        setState('recording');
        void runChunk();
      } else {
        setState('idle');
      }
    }, propsRef.current.chunkDurationMs);
  }, [recorder]);

  const start = useCallback(async (): Promise<void> => {
    if (activeRef.current) return;

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      propsRef.current.onError?.('Microphone permission denied');
      setState('error');
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch {}

    activeRef.current = true;
    setState('recording');
    void runChunk();
  }, [runChunk]);

  const stop = useCallback(async (): Promise<void> => {
    activeRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {}
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch {}
    setState('idle');
  }, [recorder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      try {
        if (recorder.isRecording) recorder.stop().catch(() => {});
      } catch {}
    };
  }, [recorder]);

  return { state, start, stop };
}
