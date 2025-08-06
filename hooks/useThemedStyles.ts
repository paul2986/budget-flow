
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './useTheme';

export const useThemedStyles = () => {
  const { currentColors, isDarkMode } = useTheme();

  const themedStyles = useMemo(() => {
    console.log('useThemedStyles: Creating themed styles for', isDarkMode ? 'dark' : 'light', 'mode');
    
    return StyleSheet.create({
      wrapper: {
        backgroundColor: currentColors.background,
        width: '100%',
        height: '100%',
      },
      container: {
        flex: 1,
        backgroundColor: currentColors.background,
        width: '100%',
        height: '100%',
      },
      content: {
        flex: 1,
        padding: 16,
      },
      scrollContent: {
        paddingBottom: 120,
      },
      title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        color: currentColors.text,
        marginBottom: 20,
        letterSpacing: -0.5,
      },
      subtitle: {
        fontSize: 20,
        fontWeight: '700',
        color: currentColors.text,
        marginBottom: 16,
        letterSpacing: -0.3,
      },
      text: {
        fontSize: 16,
        fontWeight: '400',
        color: currentColors.text,
        lineHeight: 24,
      },
      textSecondary: {
        fontSize: 14,
        fontWeight: '400',
        color: currentColors.textSecondary,
        lineHeight: 20,
      },
      section: {
        marginBottom: 24,
      },
      card: {
        backgroundColor: currentColors.backgroundAlt,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        boxShadow: isDarkMode ? '0px 4px 12px rgba(0, 0, 0, 0.3)' : '0px 4px 12px rgba(0, 0, 0, 0.08)',
        elevation: 4,
        borderWidth: 1,
        borderColor: currentColors.border,
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      rowStart: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      column: {
        flexDirection: 'column',
      },
      flex1: {
        flex: 1,
      },
      centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
      },
      input: {
        borderWidth: 2,
        borderColor: currentColors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: currentColors.backgroundAlt,
        color: currentColors.text,
        marginBottom: 16,
        fontWeight: '500',
      },
      picker: {
        borderWidth: 2,
        borderColor: currentColors.border,
        borderRadius: 12,
        backgroundColor: currentColors.backgroundAlt,
        marginBottom: 16,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: currentColors.backgroundAlt,
        borderBottomWidth: 1,
        borderBottomColor: currentColors.border,
        elevation: 2,
        shadowColor: isDarkMode ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 2,
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: currentColors.text,
        letterSpacing: -0.3,
      },
      badge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
      },
      badgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: currentColors.backgroundAlt,
      },
      emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      },
      emptyStateText: {
        fontSize: 16,
        color: currentColors.textSecondary,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 24,
      },
    });
  }, [currentColors, isDarkMode]);

  const themedButtonStyles = useMemo(() => {
    console.log('useThemedStyles: Creating themed button styles for', isDarkMode ? 'dark' : 'light', 'mode');
    
    return StyleSheet.create({
      primary: {
        backgroundColor: currentColors.primary,
        alignSelf: 'center',
        width: '100%',
      },
      secondary: {
        backgroundColor: currentColors.secondary,
        alignSelf: 'center',
        width: '100%',
      },
      danger: {
        backgroundColor: currentColors.error,
        alignSelf: 'center',
        width: '100%',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: currentColors.primary,
        alignSelf: 'center',
        width: '100%',
      },
      small: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        width: 'auto',
      },
    });
  }, [currentColors, isDarkMode]);

  return {
    themedStyles,
    themedButtonStyles,
    currentColors,
    isDarkMode,
  };
};
