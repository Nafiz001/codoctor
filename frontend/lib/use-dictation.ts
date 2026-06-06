"use client";

// Continuous Bangla dictation on the browser's Web Speech API (Chrome/Edge).
// Unlike a one-shot recognizer, this keeps listening and emits every *final*
// utterance through onFinal — auto-restarting when Chrome ends on silence — so a
// whole consultation streams in segment by segment. Keyless: the browser uses
// the platform's cloud ASR under the hood (matches the PRD's "cloud Bengali ASR").

import { useCallback, useEffect, useRef, useState } from "react";

export function useDictation(
  onFinal: (text: string, conf: number) => void,
  lang = "bn-BD"
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<any>(null);
  const wantRef = useRef(false); // user intends to keep listening
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);

    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const alt = r[0];
        if (r.isFinal) {
          const text = (alt.transcript || "").trim();
          if (text) onFinalRef.current(text, alt.confidence || 0.9);
        } else {
          interimText += alt.transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      setInterim("");
      if (wantRef.current) {
        try {
          rec.start(); // Chrome stops on silence — resume
        } catch {}
      } else {
        setListening(false);
      }
    };
    rec.onerror = (ev: any) => {
      // benign: no speech for a while, or our own stop()
      if (ev?.error === "no-speech" || ev?.error === "aborted") return;
      wantRef.current = false;
      setListening(false);
    };

    recRef.current = rec;
    return () => {
      wantRef.current = false;
      try {
        rec.abort();
      } catch {}
    };
  }, [lang]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    wantRef.current = true;
    setInterim("");
    try {
      recRef.current.start();
      setListening(true);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
    setInterim("");
  }, []);

  return { listening, supported, interim, start, stop };
}
