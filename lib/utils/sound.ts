"use client";

import { getSoundEnabled } from "@/lib/prefs/clientPrefs";

export type SoundPattern =
  | "tap"
  | "success"
  | "celebrate"
  | "restDone"
  | "warn";

type Tone = {
  freq: number;
  start: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
};

const PATTERNS: Record<SoundPattern, Tone[]> = {
  tap: [{ freq: 660, start: 0, duration: 0.08, gain: 0.08, type: "triangle" }],
  success: [
    { freq: 523.25, start: 0, duration: 0.1, gain: 0.09, type: "sine" },
    { freq: 659.25, start: 0.09, duration: 0.12, gain: 0.1, type: "sine" },
  ],
  celebrate: [
    { freq: 523.25, start: 0, duration: 0.09, gain: 0.08, type: "triangle" },
    { freq: 659.25, start: 0.08, duration: 0.1, gain: 0.09, type: "triangle" },
    { freq: 783.99, start: 0.17, duration: 0.12, gain: 0.1, type: "triangle" },
    { freq: 1046.5, start: 0.28, duration: 0.16, gain: 0.11, type: "sine" },
  ],
  restDone: [
    { freq: 659.25, start: 0, duration: 0.14, gain: 0.08, type: "sine" },
    { freq: 783.99, start: 0.12, duration: 0.14, gain: 0.09, type: "sine" },
    { freq: 987.77, start: 0.24, duration: 0.18, gain: 0.1, type: "sine" },
  ],
  warn: [
    { freq: 392, start: 0, duration: 0.1, gain: 0.08, type: "square" },
    { freq: 329.63, start: 0.1, duration: 0.12, gain: 0.08, type: "square" },
  ],
};

let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

/**
 * Plays a short, soft feedback sound using Web Audio (no media assets).
 * No-ops when sound is disabled or audio is unavailable.
 */
export function playFeedbackSound(pattern: SoundPattern) {
  if (!getSoundEnabled()) return;
  const ac = getAudioContext();
  if (!ac) return;

  try {
    if (ac.state === "suspended") {
      void ac.resume();
    }

    const now = ac.currentTime + 0.005;
    const tones = PATTERNS[pattern];
    const master = ac.createGain();
    master.gain.setValueAtTime(0.85, now);
    master.connect(ac.destination);

    for (const tone of tones) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const start = now + tone.start;
      const end = start + tone.duration;

      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.016);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(end + 0.02);
    }

    const stopAt =
      tones[tones.length - 1].start + tones[tones.length - 1].duration;
    master.gain.exponentialRampToValueAtTime(0.0001, now + stopAt + 0.03);
  } catch {
    // Audio unavailable (permissions/device/browser limitations) — ignore.
  }
}
