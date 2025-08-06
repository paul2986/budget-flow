
import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, darkColors } from '../styles/commonStyles';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app_theme_mode';

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemeMode();
  }, []);

  // Add debug logging for system color scheme changes
  useEffect(() => {
    console.log('useTheme: System color scheme changed to:', systemColorScheme);
  }, [systemColorScheme]);

  // Add debug logging for theme mode changes
  useEffect(() => {
    console.log('useTheme: Theme mode changed to:', themeMode);
  }, [themeMode]);

  const loadThemeMode = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      console.log('useTheme: Loaded saved theme from storage:', savedTheme);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveThemeMode = async (mode: ThemeMode) => {
    try {
      console.log('useTheme: Saving theme mode to storage:', mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeMode(mode);
      console.log('useTheme: Theme mode saved and state updated');
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const currentColors = isDarkMode ? darkColors : colors;

  // Add debug logging for computed values
  useEffect(() => {
    console.log('useTheme: Computed values updated', {
      themeMode,
      systemColorScheme,
      isDarkMode,
      currentColorsType: isDarkMode ? 'dark' : 'light'
    });
  }, [themeMode, systemColorScheme, isDarkMode]);

  return {
    themeMode,
    setThemeMode: saveThemeMode,
    isDarkMode,
    currentColors,
    loading,
  };
};
