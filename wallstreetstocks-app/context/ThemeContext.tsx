// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  success: string;
  danger: string;
  warning: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  primary: '#007AFF',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
};

const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#ABABAB',
  textTertiary: '#8E8E93',
  border: '#38383A',
  borderLight: '#2C2C2E',
  primary: '#0A84FF',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        setModeState(savedMode);
      }
    } catch (error) {
    } finally {
      setIsLoaded(true);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
    }
  };

  // Determine if we're in dark mode
  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  // Don't render until we've loaded the theme
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { lightColors, darkColors };
