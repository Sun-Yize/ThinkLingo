import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { StylesConfig } from 'react-select';

// ── Theme types ──────────────────────────────────────────────────────
export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
});

const STORAGE_KEY = 'thinklingo_theme';

// ── Provider ─────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* ignore */ }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// ── React-select styles (shared by SettingsModal & ApiConfigModal) ───
type SelectOption = { value: string; label: string; isDisabled?: boolean };

export function getSelectStyles(isDark: boolean): StylesConfig<SelectOption, false> {
  if (isDark) {
    return {
      control: (base, state) => ({
        ...base,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: state.isFocused ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.10)',
        borderRadius: '10px',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(124,58,237,0.14)' : 'none',
        minHeight: '38px',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': { borderColor: 'rgba(255,255,255,0.20)' },
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: '#181828',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }),
      menuList: (base) => ({ ...base, padding: '4px' }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? 'rgba(124,58,237,0.28)'
          : state.isFocused && !state.isDisabled
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
        color: state.isDisabled
          ? 'rgba(255,255,255,0.20)'
          : state.isSelected
            ? '#c4b5fd'
            : 'rgba(255,255,255,0.78)',
        fontSize: '13px',
        padding: '7px 10px',
        borderRadius: '7px',
        cursor: state.isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.1s',
      }),
      singleValue: (base) => ({ ...base, color: 'rgba(255,255,255,0.85)', fontSize: '13px' }),
      placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.28)', fontSize: '13px' }),
      indicatorSeparator: (base) => ({ ...base, backgroundColor: 'rgba(255,255,255,0.10)' }),
      dropdownIndicator: (base) => ({
        ...base,
        color: 'rgba(255,255,255,0.28)',
        padding: '0 6px',
        '&:hover': { color: 'rgba(255,255,255,0.55)' },
      }),
      input: (base) => ({ ...base, color: 'rgba(255,255,255,0.85)' }),
      clearIndicator: (base) => ({
        ...base,
        color: 'rgba(255,255,255,0.28)',
        '&:hover': { color: 'rgba(255,255,255,0.55)' },
      }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    };
  }

  // ── Light theme ────────────────────────────────────────────────────
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#FFFFFF',
      borderColor: state.isFocused ? 'rgba(139,92,246,0.50)' : 'rgba(30,20,50,0.14)',
      borderRadius: '10px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(124,58,237,0.10)' : 'none',
      minHeight: '38px',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      '&:hover': { borderColor: 'rgba(30,20,50,0.22)' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#FFFFFF',
      border: '1px solid rgba(30,20,50,0.10)',
      borderRadius: '10px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.10)',
      overflow: 'hidden',
    }),
    menuList: (base) => ({ ...base, padding: '4px' }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'rgba(124,58,237,0.12)'
        : state.isFocused && !state.isDisabled
          ? 'rgba(30,20,50,0.04)'
          : 'transparent',
      color: state.isDisabled
        ? 'rgba(30,20,50,0.28)'
        : state.isSelected
          ? '#7c3aed'
          : 'rgba(30,20,50,0.78)',
      fontSize: '13px',
      padding: '7px 10px',
      borderRadius: '7px',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.1s',
    }),
    singleValue: (base) => ({ ...base, color: 'rgba(30,20,50,0.85)', fontSize: '13px' }),
    placeholder: (base) => ({ ...base, color: 'rgba(30,20,50,0.35)', fontSize: '13px' }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: 'rgba(30,20,50,0.12)' }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'rgba(30,20,50,0.30)',
      padding: '0 6px',
      '&:hover': { color: 'rgba(30,20,50,0.55)' },
    }),
    input: (base) => ({ ...base, color: 'rgba(30,20,50,0.85)' }),
    clearIndicator: (base) => ({
      ...base,
      color: 'rgba(30,20,50,0.30)',
      '&:hover': { color: 'rgba(30,20,50,0.55)' },
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };
}
