import { Platform } from 'react-native';

function makeStorage() {
  if (Platform.OS === 'web') {
    return {
      getString: (key: string): string | undefined => localStorage.getItem(key) ?? undefined,
      set: (key: string, value: string): void => localStorage.setItem(key, value),
      delete: (key: string): void => localStorage.removeItem(key),
      contains: (key: string): boolean => localStorage.getItem(key) !== null,
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MMKV } = require('react-native-mmkv');
  const mmkv = new MMKV({ id: 'cartomanzia' });
  return {
    getString: (key: string): string | undefined => mmkv.getString(key),
    set: (key: string, value: string): void => mmkv.set(key, value),
    delete: (key: string): void => mmkv.delete(key),
    contains: (key: string): boolean => mmkv.contains(key),
  };
}

export const Storage = makeStorage();
