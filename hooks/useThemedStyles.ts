
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './useTheme';

export const useThemedStyles = () => {
  const { currentColors } = useTheme();

  const themedStyles = useMemo(() => StyleSheet.create({
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
      position: 'relative', // Ensure proper positioning context
    },
    content: {
      flex: 1,
      padding: 16,
      paddingBottom: 0, // Remove bottom padding from content, handled by scrollContent
    },
    scrollContent: {
      paddingBottom: 120, // Reduced padding to allow content to scroll closer to bottom
      minHeight: '100%', // Ensure content takes full height to prevent clipping
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
      padding: 10, // Standardized padding to match all other cards
      marginBottom: 16,
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
      elevation: 4,
      borderWidth: 1,
      borderColor: currentColors.border,
      width: '100%', // Standardized full width for all cards
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
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
    // iOS 26 Style Floating Tab Bar
    floatingTabContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 20,
      zIndex: 1000, // Ensure tab bar stays on top
      pointerEvents: 'box-none', // Allow touches to pass through container but not the tab bar itself
    },
    floatingTabBar: {
      flexDirection: 'row',
      borderRadius: 28,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderWidth: 1,
      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
      elevation: 12,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      backdropFilter: 'blur(20px)',
      minHeight: 64,
      marginBottom: 20, // Set margin to match left/right padding (20px)
      pointerEvents: 'auto', // Ensure tab bar receives touches
    },
    floatingTabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginHorizontal: 2,
      minHeight: 48,
    },
    // Legacy tab bar styles (kept for compatibility)
    tabBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  }), [currentColors]);

  const themedButtonStyles = useMemo(() => StyleSheet.create({
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
  }), [currentColors]);

  return {
    themedStyles,
    themedButtonStyles,
  };
};
