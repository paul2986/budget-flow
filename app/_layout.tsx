
import { useEffect, useCallback, useMemo } from 'react';
import { useTheme, ThemeProvider } from '../hooks/useTheme';
import { useToast, ToastProvider } from '../hooks/useToast';
import { useBudgetData } from '../hooks/useBudgetData';
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

// Wrapper component to provide budget data context to CustomTabBar
function CustomTabBarWrapper() {
  return <CustomTabBar />;
}

function CustomTabBar() {
  const { currentColors, isDarkMode, themeMode } = useTheme();
  const { themedStyles } = useThemedStyles();
  const { appData, activeBudget } = useBudgetData();
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

  // Hide tab bar for first-time users (no budgets exist or no active budget)
  // BUT always show on expenses, people, and add-expense screens regardless of first-time user status
  const shouldHideTabBar = useMemo(() => {
    // Always show tab bar on expenses, people, and add-expense screens
    if (pathname === '/expenses' || pathname === '/people' || pathname === '/add-expense') {
      console.log('CustomTabBar: Always showing tab bar on expenses/people/add-expense screen');
      return false;
    }
    
    const hasNoBudgets = !appData || !appData.budgets || appData.budgets.length === 0;
    const hasNoActiveBudget = !activeBudget;
    const isFirstTimeUser = hasNoBudgets || hasNoActiveBudget;
    
    console.log('CustomTabBar: Tab bar visibility check:', {
      hasNoBudgets,
      hasNoActiveBudget,
      isFirstTimeUser,
      budgetsCount: appData?.budgets?.length || 0,
      activeBudgetId: activeBudget?.id || 'none',
      pathname
    });
    
    return isFirstTimeUser;
  }, [appData, activeBudget, pathname]);

  useEffect(() => {
    console.log('CustomTabBar: Theme updated', { isDarkMode, themeMode, currentColors });
  }, [isDarkMode, themeMode, currentColors]);

  // Don't render tab bar for first-time users
  if (shouldHideTabBar) {
    console.log('CustomTabBar: Hiding tab bar for first-time user');
    return null;
  }

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
          const iconColor = isActive ? currentColors.primary : currentColors.text; // Changed from textSecondary to text for better contrast

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
  // Only handle actual deep links, not the app's initial launch
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      
      try {
        console.log('Deep link received:', url);
        
        // Parse the URL to check if it's a meaningful deep link
        const parsedUrl = Linking.parse(url);
        
        // Only handle URLs that have query parameters or specific paths
        // This prevents the app's base URL from triggering navigation
        if (parsedUrl.queryParams && Object.keys(parsedUrl.queryParams).length > 0) {
          console.log('Processing deep link with query params:', parsedUrl.queryParams);
          router.push({ pathname: '/import-link', params: { q: url } });
        } else if (parsedUrl.path && parsedUrl.path !== '/' && parsedUrl.path !== '') {
          console.log('Processing deep link with path:', parsedUrl.path);
          router.push({ pathname: '/import-link', params: { q: url } });
        } else {
          console.log('Ignoring base app URL:', url);
        }
      } catch (e) {
        console.log('Deep link handling error', e);
      }
    };

    // Initial URL - only process if it's a meaningful deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL received:', url);
        // Add a small delay to ensure the app has fully loaded
        setTimeout(() => handleUrl(url), 100);
      }
    }).catch((e) => console.log('getInitialURL error', e));

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
    // Outer wrapper paints the top safe area the same color as the page background for welcome page
    <View style={{ flex: 1, backgroundColor: currentColors.background }}>
      {/* Status bar matches page background color */}
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={currentColors.background} />

      {/* Explicit top safe area spacer with page background color */}
      <View style={{ height: insets.top, backgroundColor: currentColors.background }} />

      {/* Content area uses the page background color; no bottom safe area padding */}
      <View style={{ flex: 1, backgroundColor: currentColors.background }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
          tabBar={() => <CustomTabBarWrapper />}
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
