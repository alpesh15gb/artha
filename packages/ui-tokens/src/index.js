export const tokens = {
  colors: {
    primary: '#0ea5e9',      // Sky 500 - Trust/Calm
    primaryLight: '#38bdf8',
    primaryDark: '#0284c7',
    
    // Professional dark theme
    background: '#f8fafc',   // Slate 50
    surface: '#ffffff',      // White
    surfaceAlt: '#f1f5f9',   // Slate 100
    
    // Text hierarchy
    text: '#0f172a',         // Slate 900
    textSecondary: '#475569', // Slate 600
    textMuted: '#94a3b8',    // Slate 400
    
    // Semantic colors
    success: '#059669',      // Emerald 600
    successLight: '#d1fae5',
    warning: '#d97706',      // Amber 600
    warningLight: '#fef3c7',
    error: '#dc2626',        // Red 600
    errorLight: '#fee2e2',
    info: '#0284c7',         // Sky 600
    infoLight: '#e0f2fe',
    
    // Borders
    border: '#e2e8f0',       // Slate 200
    borderLight: '#f1f5f9',  // Slate 100
    
    // Accent
    accent: '#6366f1',       // Indigo 500
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headings: {
      h1: 'text-3xl font-bold tracking-tight',
      h2: 'text-2xl font-semibold tracking-tight',
      h3: 'text-xl font-semibold',
      h4: 'text-lg font-medium',
    },
    body: 'text-sm leading-relaxed',
    small: 'text-xs',
    caption: 'text-[11px]',
  }
};