"use client";

/**
 * Lightweight client-side preferences persisted in localStorage so they don't
 * require a database migration. Used for tactile/audio feedback toggles.
 */

const HAPTICS_KEY = "meredian.haptics";
const SOUND_KEY = "meredian.sound";

function read(key: string): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(key) !== "off";
}

function write(key: string, on: boolean) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, on ? "on" : "off");
}

export function getHapticsEnabled(): boolean {
  return read(HAPTICS_KEY);
}

export function setHapticsEnabled(on: boolean) {
  write(HAPTICS_KEY, on);
}

export function getSoundEnabled(): boolean {
  return read(SOUND_KEY);
}

export function setSoundEnabled(on: boolean) {
  write(SOUND_KEY, on);
}
