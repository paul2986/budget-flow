
import { useEffect, useCallback, useMemo } from 'react';
import { useTheme, ThemeProvider } from '../hooks/useTheme';
import { useToast, ToastProvider } from '../hooks/useToast';
import { StatusBar } from 'expo-status-bar';
import { Tabs, router, usePathname } from 'expo-router';
import { setupErrorLogging } from '../utils/errorLogger';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../hooks/useThemedStyles';
import Icon from '../components/Icon';
import ToastContainer from '../components/ToastContainer';
import * as Linking from 'expo-linking';

const STORAGE_KEY = 'app_theme_mode';

function CustomTabBar() {
  const { currentColors, isDarkMode, themeMode } = useTheme();
  const { themedStyles } = useThemedStyles();
  const pathname = usePathname();

  const navigateToTab = useCallback((route: string) => {
    console.log('CustomTabBar: Navigating to:', route);
    router.replace(route);
  }, []);

  const tabs = useMemo(() => [
    { route: '/', icon: 'home-outline', activeIcon: 'home' },
    { route: '/people', icon: 'people-outline', activeIcon: 'people' },
    { route: '/expenses', icon: 'receipt-outline', activeIcon: 'receipt' },
    { route: '/tools', icon: 'calculator-outline', activeIcon: 'calculator' },
    { route: '/settings', icon: 'settings-outline', activeIcon: 'settings' },
  ], []);

  useEffect(() => {
    console.log('CustomTabBar: Theme updated', { isDarkMode, themeMode, currentColors });
  }, [isDarkMode, themeMode, currentColors]);

  return (
    <View
      style={[
        themedStyles.floatingTabContainer,
        {
          // Remove bottom safe area padding; keep fixed spacing
          paddingBottom: 20,
        },
      ]}
    >
      <View
        style={[
          themedStyles.floatingTabBar,
          {
            backgroundColor: currentColors.backgroundAlt,
            borderColor: currentColors.border,
            shadowColor: '#000',
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          const iconColor = isActive ? currentColors.primary : currentColors.textSecondary;

          return (
            <TouchableOpacity
              key={tab.route}
              style={[
                themedStyles.floatingTabItem,
                isActive && {
                  backgroundColor: `${currentColors.primary}15`,
                },
              ]}
              onPress={() => navigateToTab(tab.route)}
              activeOpacity={0.7}
            >
              <Icon name={isActive ? (tab.activeIcon as any) : (tab.icon as any)} size={26} style={{ color: iconColor }} />
            </TouchableOpacity>
          );
        })}
      </View>
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

  useEffect(() => {
    console.log('RootLayoutContent: Theme updated', { isDarkMode, themeMode, currentColors });
  }, [isDarkMode, themeMode, currentColors]);

  // Deep link handler: route to /import-link and prefill "q" with the incoming URL
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      try {
        console.log('Deep link received:', url);
        // Push to import-link with query param
        router.push({ pathname: '/import-link', params: { q: url } });
      } catch (e) {
        console.log('Deep link handling error', e);
      }
    };

    // Initial URL
    Linking.getInitialURL().then(handleUrl).catch((e) => console.log('getInitialURL error', e));

    // Subscribe to future URLs
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => {
      try {
        // RN SDK > 49 uses remove() on the subscription
        (sub as any)?.remove?.();
      } catch (e) {
        console.log('remove listener error', e);
      }
    };
  }, []);

  return (
    // Outer wrapper paints the top safe area the same color as headers
    <View style={{ flex: 1, backgroundColor: currentColors.backgroundAlt }}>
      {/* Status bar matches header color */}
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={currentColors.backgroundAlt} />

      {/* Explicit top safe area spacer with header color */}
      <View style={{ height: insets.top, backgroundColor: currentColors.backgroundAlt }} />

      {/* Content area uses the page background color; no bottom safe area padding */}
      <View style={{ flex: 1, backgroundColor: currentColors.background }}>
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
          <Tabs.Screen name="budgets" options={{ href: null }} />
          <Tabs.Screen name="tools" />
          <Tabs.Screen name="import-link" options={{ href: null }} />
          <Tabs.Screen name="budget-lock" options={{ href: null }} />
          <Tabs.Screen name="manage-categories" options={{ href: null }} />
          <Tabs.Screen name="auth" options={{ href: null }} />
        </Tabs>

        <ToastContainer toasts={toasts} onHideToast={hideToast} />
      </View>
    </View>
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
