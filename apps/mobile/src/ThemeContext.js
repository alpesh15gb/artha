import React, { useState } from 'react';
import { createContext, useContext } from 'react';

// Dark & Light palettes
const dark = {
  colors: {
    background: '#0a0a0f',
    surface: '#16161f',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    text: '#f1f5f9',
    textDim: '#94a3b8',
    textMuted: '#64748b',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    border: 'rgba(255,255,255,0.06)',
  },
};

const light = {
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    text: '#0f172a',
    textDim: '#64748b',
    textMuted: '#94a3b8',
    success: '#059669',
    error: '#dc2626',
    warning: '#d97706',
    border: 'rgba(0,0,0,0.06)',
  },
};

const ThemeContext = createContext({ theme: dark, toggleTheme: () => {}, isDark: true });

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark(p => !p);
  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// useTheme returns theme.colors directly for backwards compat
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  return ctx.theme;
};

// For settings toggle
export const useThemeControl = () => useContext(ThemeContext);
