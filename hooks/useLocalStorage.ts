import { useState, useEffect } from 'react';
import React from 'react';

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    if (saved !== null && saved !== 'undefined') {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse localStorage value', e);
        return defaultValue;
      }
    }
  }
  return defaultValue;
}

export default function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to set localStorage value', e);
    }
  }, [key, value]);

  return [value, setValue];
}