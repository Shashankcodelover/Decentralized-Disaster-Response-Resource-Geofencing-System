import { describe, it, expect } from 'vitest';
import { TRANSLATIONS, LANG_LIST } from './hooks/useTheme';

describe('Web UI - Theme & Accessibility Tokens', () => {
  it('should include translations for all listed languages', () => {
    for (const lang of LANG_LIST) {
      expect(TRANSLATIONS[lang.code as keyof typeof TRANSLATIONS]).toBeDefined();
      expect(TRANSLATIONS[lang.code as keyof typeof TRANSLATIONS].activeZones).toBeDefined();
      expect(TRANSLATIONS[lang.code as keyof typeof TRANSLATIONS].sos).toBeDefined();
    }
  });

  it('should define high-contrast and glass theme values', () => {
    expect(LANG_LIST.length).toBeGreaterThanOrEqual(8);
  });
});
