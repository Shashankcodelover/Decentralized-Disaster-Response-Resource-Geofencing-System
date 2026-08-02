import { useState, useEffect, useMemo, useCallback } from 'react';
import { TRANSLATIONS, LANG_LIST, translate } from '../i18n/locales';
import type { Language } from '../i18n/locales';
import { API_URL } from '../config';

export type ThemeMode = 'glass' | 'contrast';
export type TextSize = 'sm' | 'md' | 'lg';

// Re-export i18n types and constants so existing consumers don't break
export type { Language };
export { TRANSLATIONS, LANG_LIST };

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('mirage_theme') as ThemeMode) || 'glass';
  });

  const [textSize, setTextSize] = useState<TextSize>(() => {
    return (localStorage.getItem('mirage_text_size') as TextSize) || 'md';
  });

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('mirage_lang') as Language) || 'en';
  });

  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'coordinator' | 'field_agent' | 'responder' | 'viewer'>(() => {
    return (localStorage.getItem('mirage_role') as any) || 'viewer';
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mirage_token');
  });

  // Automatically fetch token when role changes
  useEffect(() => {
    if (userRole === 'viewer') {
      setToken(null);
      localStorage.removeItem('mirage_token');
      return;
    }
    
    fetch(`${API_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub: `user_${userRole}`,
        role: userRole,
        secret: import.meta.env.VITE_AUTH_SECRET ?? 'change_me_in_production',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('mirage_token', data.token);
        }
      })
      .catch((err) => console.error('Auto-auth failed:', err));
  }, [userRole]);

  // Detect low-end devices or browsers without backdrop-filter support
  useEffect(() => {
    const hasBackdropFilter = CSS.supports('backdrop-filter', 'blur(15px)');
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Flag device as low-end if no backdrop-filter or CPU cores <= 2 on mobile
    if (!hasBackdropFilter || (isMobile && hardwareConcurrency <= 2)) {
      setIsLowEndDevice(true);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const nextMode = prev === 'glass' ? 'contrast' : 'glass';
      localStorage.setItem('mirage_theme', nextMode);
      return nextMode;
    });
    triggerHaptic('success');
  }, []);

  const changeTextSize = useCallback((size: TextSize) => {
    setTextSize(size);
    localStorage.setItem('mirage_text_size', size);
    triggerHaptic('success');
  }, []);

  const changeLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('mirage_lang', newLang);
    triggerHaptic('success');
  }, []);

  const changeRole = useCallback((newRole: typeof userRole) => {
    setUserRole(newRole);
    localStorage.setItem('mirage_role', newRole);
    triggerHaptic('success');
  }, []);

  // Haptic feedback triggers using standard Web Vibration API
  const triggerHaptic = useCallback((pattern: 'sos' | 'success' | 'warning' | 'tap') => {
    if (!navigator.vibrate) return;
    
    switch (pattern) {
      case 'sos':
        navigator.vibrate([100, 50, 100, 50, 100]); // Heartbeat SOS
        break;
      case 'success':
        navigator.vibrate([15]); // Sharp tap success
        break;
      case 'warning':
        navigator.vibrate([200, 100, 200]); // Warning vibration
        break;
      case 'tap':
        navigator.vibrate([8]); // Very light tab feedback
        break;
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translate(lang, key);
  }, [lang]);

  // Memoize the styles object so consumers don't re-render on every
  // unrelated state change (e.g. token refresh). Only recomputes when
  // the actual visual inputs change.
  const styles = useMemo(() => {
    const baseFontSize = textSize === 'sm' ? '12px' : textSize === 'md' ? '14px' : '17px';
    const isContrast = themeMode === 'contrast';
    
    return {
      fontSize: baseFontSize,
      fontFamily: isContrast ? '"Courier New", Courier, monospace' : 'system-ui, -apple-system, sans-serif',
      appBg: isContrast ? '#000000' : '#040b16',
      textColor: isContrast ? '#00ff00' : '#e2e8f0',
      borderColor: isContrast ? '#00ff00' : '#1e3a5f',
      borderWidth: isContrast ? '2px' : '1px',
      
      // Panel styling
      panelBg: isContrast 
        ? '#000000' 
        : (isLowEndDevice ? 'rgba(7, 15, 30, 0.98)' : 'rgba(7, 15, 30, 0.65)'),
      panelBackdrop: isLowEndDevice || isContrast ? 'none' : 'blur(15px)',
      
      // Dynamic buttons
      btnPrimaryBg: isContrast ? 'transparent' : '#2563eb',
      btnPrimaryColor: isContrast ? '#00ff00' : '#ffffff',
      btnPrimaryBorder: isContrast ? '2px solid #00ff00' : '1px solid #2563eb',
      
      btnDangerBg: isContrast ? 'transparent' : '#dc2626',
      btnDangerColor: isContrast ? '#ff3333' : '#ffffff',
      btnDangerBorder: isContrast ? '2px solid #ff3333' : '1px solid #dc2626',

      headerBg: isContrast ? '#000000' : 'linear-gradient(90deg, #020c1b 0%, #0a1628 50%, #020c1b 100%)',
      statsBarBg: isContrast ? '#000000' : '#040e1c',
      
      glowColor: isContrast ? 'rgba(0, 255, 0, 0.6)' : 'rgba(56, 189, 248, 0.5)',
      
      glowShadow: isContrast 
        ? '0 0 10px #00ff00' 
        : '0 4px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    };
  }, [themeMode, textSize, isLowEndDevice]);

  return {
    themeMode,
    textSize,
    lang,
    userRole,
    token,
    isLowEndDevice,
    toggleTheme,
    changeTextSize,
    changeLanguage,
    changeRole,
    triggerHaptic,
    t,
    styles,
  };
}

export type ThemeHook = ReturnType<typeof useTheme>;
