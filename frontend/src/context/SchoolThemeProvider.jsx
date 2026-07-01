import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const FALLBACK_THEME = {
  primary_color: '#2563EB',
  secondary_color: '#1E40AF',
  accent_color: '#FFFFFF',
  logo_url: '',
  name: '',
  slug: '',
};

const SchoolThemeContext = createContext({
  branding: FALLBACK_THEME,
  setBranding: () => {},
  resetBranding: () => {},
});

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  const sixDigitMatch = /^#([0-9a-fA-F]{6})$/.exec(trimmed);
  if (sixDigitMatch) {
    return `#${sixDigitMatch[1].toUpperCase()}`;
  }

  const threeDigitMatch = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (threeDigitMatch) {
    const [r, g, b] = threeDigitMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return fallback;
}

function applyThemeVariables(branding) {
  const root = document.documentElement;
  root.style.setProperty('--school-primary', normalizeHexColor(branding.primary_color, FALLBACK_THEME.primary_color));
  root.style.setProperty('--school-secondary', normalizeHexColor(branding.secondary_color, FALLBACK_THEME.secondary_color));
  root.style.setProperty('--school-accent', normalizeHexColor(branding.accent_color, FALLBACK_THEME.accent_color));
}

export function SchoolThemeProvider({ children }) {
  const [branding, setBrandingState] = useState(FALLBACK_THEME);

  useEffect(() => {
    applyThemeVariables(branding);
  }, [branding]);

  const setBranding = useCallback((nextBranding = {}) => {
    setBrandingState((current) => ({
      ...current,
      ...nextBranding,
      primary_color: normalizeHexColor(nextBranding.primary_color, current.primary_color || FALLBACK_THEME.primary_color),
      secondary_color: normalizeHexColor(nextBranding.secondary_color, current.secondary_color || FALLBACK_THEME.secondary_color),
      accent_color: normalizeHexColor(nextBranding.accent_color, current.accent_color || FALLBACK_THEME.accent_color),
    }));
  }, []);

  const resetBranding = useCallback(() => {
    setBrandingState(FALLBACK_THEME);
  }, []);

  const value = useMemo(() => ({ branding, setBranding, resetBranding }), [branding, setBranding, resetBranding]);

  return <SchoolThemeContext.Provider value={value}>{children}</SchoolThemeContext.Provider>;
}

export function useSchoolTheme() {
  return useContext(SchoolThemeContext);
}
