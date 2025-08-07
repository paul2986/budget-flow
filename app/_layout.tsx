
import { useEffect, useCallback, useMemo } from 'react';
import { useTheme, ThemeProvider } from '../hooks/useTheme';
import { useToast, ToastProvider } from '../hooks/useToast';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router';
import { setupErrorLogging } from '../utils/errorLogger';
import { router, usePathname } from 'expo-router';
import { Platform, SafeAreaView, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from '../components/Icon';
import ToastContainer from '../components/ToastContainer';

const STORAGE_KEY = 'app_theme_mode';

function CustomTabBar() {
  const { currentColors, isDarkMode, themeMode } = useTheme();
  const { themedStyles } = useThemedStyles();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const navigateToTab = useCallback((route: string) => {
    console.log('CustomTabBar: Navigating to:', route);
    router.replace(route);
  }, []);

  const tabs = useMemo(() => [
    { route: '/', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
    { route: '/people', icon: 'people-outline', activeIcon: 'people', label: 'People' },
    { route: '/expenses', icon: 'receipt-outline', activeIcon: 'receipt', label: 'Expenses' },
    { route: '/settings', icon: 'settings-outline', activeIcon: 'settings', label: 'Settings' },
  ], []);

  useEffect(() => {
    console.log('CustomTabBar: Theme updated', { isDarkMode, themeMode, currentColors });
  }, [isDarkMode, themeMode, currentColors]);

  return (
    <View style={[
      themedStyles.tabBar,
      {
        paddingBottom: Math.max(insets.bottom, 16),
        backgroundColor: currentColors.backgroundAlt,
        borderTopColor: currentColors.border,
      }
    ]}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        const iconColor = isActive ? currentColors.primary : currentColors.textSecondary;
        const textColor = isActive ? currentColors.primary : currentColors.textSecondary;

        return (
          <TouchableOpacity
            key={tab.route}
            style={themedStyles.tabItem}
            onPress={() => navigateToTab(tab.route)}
            activeOpacity={0.7}
          >
            <Icon
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              style={{ color: iconColor, marginBottom: 4 }}
            />
            <Text style={[themedStyles.tabLabel, { color: textColor }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function RootLayoutContent() {
  const { currentColors, isDarkMode, themeMode } = useTheme();
  const { themedStyles } = useThemedStyles();
  const insets = useSafeAreaInsets();
  const { toasts, hideToast } = useToast();

  useEffect(() => {
    setupErrorLogging();
  }, []);

  const containerStyle = useMemo(() => ({
    flex: 1,
    backgroundColor: currentColors.background,
    paddingTop: insets.top,
  }), [currentColors.background, insets.top]);

  useEffect(() => {
    console.log('RootLayoutContent: Theme updated', { isDarkMode, themeMode, currentColors });
  }, [isDarkMode, themeMode, currentColors]);

  return (
    <SafeAreaView style={containerStyle}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={currentColors.background} />
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
        tabBar={() => <CustomTabBar />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="people" />
        <Tabs.Screen name="expenses" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="add-expense" options={{ href: null }} />
        <Tabs.Screen name="edit-person" options={{ href: null }} />
        <Tabs.Screen name="edit-income" options={{ href: null }} />
      </Tabs>

      <ToastContainer toasts={toasts} onHideToast={hideToast} />
    </SafeAreaView>
  );
}

function AppContent() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RootLayoutContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
