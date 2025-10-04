
import { useEffect, useCallback, useMemo, useState } from 'react';
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
  // BUT always show on expenses, people, add-expense, settings, and tools screens regardless of first-time user status
  const shouldHideTabBar = useMemo(() => {
    // Always show tab bar on expenses, people, add-expense, settings, and tools screens
    if (pathname === '/expenses' || pathname === '/people' || pathname === '/add-expense' || pathname === '/settings' || pathname === '/tools') {
      console.log('CustomTabBar: Always showing tab bar on expenses/people/add-expense/settings/tools screen');
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
  const { appData, activeBudget, data, loading, refreshTrigger } = useBudgetData();
  const pathname = usePathname();
  
  // Stable loading state that prevents flickering
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Track when data has been loaded at least once
  useEffect(() => {
    if (!loading && isInitialLoad) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, isInitialLoad]);

  useEffect(() => {
    setupErrorLogging();
  }, []);

  useEffect(() => {
    console.log('RootLayoutContent: Theme updated', { isDarkMode, themeMode, currentColors });
  }, [isDarkMode, themeMode, currentColors]);

  // Determine page state with stable logic
  const pageState = useMemo(() => {
    // If still in initial loading, return loading state
    if (isInitialLoad || loading) {
      return 'loading';
    }

    // Welcome page is when user is on index route AND it's first-time user experience
    if (pathname !== '/') {
      return 'normal';
    }
    
    // First-time user if no budgets exist or no active budget
    const hasNoBudgets = !appData || !appData.budgets || appData.budgets.length === 0;
    const hasNoActiveBudget = !activeBudget;
    
    if (hasNoBudgets || hasNoActiveBudget) {
      return 'welcome';
    }

    // Check if we have an active budget but incomplete setup
    if (activeBudget && data) {
      const people = data && data.people && Array.isArray(data.people) ? data.people : [];
      const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];
      
      // Guidance screens show when we have a budget but incomplete setup
      if (people.length === 0 || expenses.length === 0) {
        return 'guidance';
      }
    }
    
    return 'normal';
  }, [isInitialLoad, loading, pathname, appData, activeBudget, data]);

  console.log('RootLayoutContent: Page state calculation', {
    pageState,
    pathname,
    isInitialLoad,
    loading,
    budgetsCount: appData?.budgets?.length || 0,
    activeBudgetId: activeBudget?.id || 'none',
    peopleCount: data?.people?.length || 0,
    expensesCount: data?.expenses?.length || 0,
    refreshTrigger
  });

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

  // Determine safe zone background color based on page state
  const safeZoneBackgroundColor = useMemo(() => {
    switch (pageState) {
      case 'loading':
        // Use header background during loading to prevent flicker
        return currentColors.backgroundAlt;
      case 'welcome':
        // Dark background for welcome page
        return currentColors.background;
      case 'guidance':
        // Header background for guidance screens ("Budget Ready" and "You're almost ready")
        return currentColors.backgroundAlt;
      case 'normal':
      default:
        // Header background for normal pages
        return currentColors.backgroundAlt;
    }
  }, [pageState, currentColors]);

  console.log('RootLayoutContent: Safe zone background color', {
    pageState,
    safeZoneBackgroundColor,
    backgroundMain: currentColors.background,
    backgroundAlt: currentColors.backgroundAlt
  });

  return (
    // Outer wrapper paints the top safe area with conditional background color
    <View style={{ flex: 1, backgroundColor: safeZoneBackgroundColor }}>
      {/* Status bar matches safe zone background */}
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'} 
        backgroundColor={safeZoneBackgroundColor} 
      />

      {/* Explicit top safe area spacer with conditional background color */}
      <View style={{ height: insets.top, backgroundColor: safeZoneBackgroundColor }} />

      {/* Content area always uses the page background color */}
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
          <Tabs.Screen name="import-budget" options={{ href: null }} />
          <Tabs.Screen name="budget-lock" options={{ href: null }} />
          <Tabs.Screen name="manage-categories" options={{ href: null }} />
          <Tabs.Screen name="auth/index" options={{ href: null }} />
          <Tabs.Screen name="auth/callback" options={{ href: null }} />
          <Tabs.Screen name="auth/debug" options={{ href: null }} />
          <Tabs.Screen name="auth/email" options={{ href: null }} />
          <Tabs.Screen name="auth/lock" options={{ href: null }} />
          <Tabs.Screen name="auth/verify" options={{ href: null }} />
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
