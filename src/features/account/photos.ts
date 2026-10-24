import { useEffect, useState } from 'react';
import { listDemoProfiles } from '../registration/demoService';
export const PHOTO_KEY = 'profly:demo:photos:v1';
export const photoEvent = 'profly:photo-changed';
function photos(): Record<string, string | null> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PHOTO_KEY) ?? '{}');
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every((value) => value === null || typeof value === 'string')
    )
      return parsed as Record<string, string | null>;
  } catch {
    throw new Error('Os dados de foto não puderam ser lidos e foram preservados.');
  }
  throw new Error('Os dados de foto não puderam ser lidos e foram preservados.');
}
export function readPhoto(email: string) {
  try {
    const stored = photos();
    if (Object.hasOwn(stored, email)) return stored[email] ?? undefined;
    return listDemoProfiles().find((profile) => profile.email === email)?.photo;
  } catch {
    return undefined;
  }
}
export function savePhoto(email: string, photo?: string) {
  localStorage.setItem(PHOTO_KEY, JSON.stringify({ ...photos(), [email]: photo ?? null }));
  window.dispatchEvent(new Event(photoEvent));
}
export function preparePhotoMove(email: string, nextEmail: string) {
  const current = photos();
  if (Object.hasOwn(current, email)) {
    current[nextEmail] = current[email];
    delete current[email];
  }
  return JSON.stringify(current);
}
export function usePhoto(email: string) {
  const [value, setValue] = useState(() => readPhoto(email));
  useEffect(() => {
    const refresh = () => setValue(readPhoto(email));
    refresh();
    window.addEventListener(photoEvent, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(photoEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [email]);
  return { photo: value, save: (next?: string) => savePhoto(email, next) };
}
