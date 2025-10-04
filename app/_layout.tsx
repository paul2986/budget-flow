
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
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';

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

  // FIXED: Move useSharedValue calls outside of useMemo to fix React Hook rules
  const tabAnimation0 = useSharedValue(0);
  const tabAnimation1 = useSharedValue(0);
  const tabAnimation2 = useSharedValue(0);
  const tabAnimation3 = useSharedValue(0);
  const tabAnimation4 = useSharedValue(0);
  const selectorPosition = useSharedValue(0);
  const selectorScale = useSharedValue(1);

  // Animation values for each tab - now using the individual shared values
  const tabAnimations = useMemo(() => [
    tabAnimation0,
    tabAnimation1,
    tabAnimation2,
    tabAnimation3,
    tabAnimation4,
  ], [tabAnimation0, tabAnimation1, tabAnimation2, tabAnimation3, tabAnimation4]);

  const navigateToTab = useCallback((route: string, tabIndex: number) => {
    console.log('CustomTabBar: Navigating to:', route);
    
    // Animate the selector to the new position
    selectorPosition.value = withSpring(tabIndex, {
      damping: 15,
      stiffness: 150,
      mass: 1,
    });

    // Add a playful bounce effect to the selector
    selectorScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );

    // Animate the tapped tab with a bounce
    tabAnimations[tabIndex].value = withSequence(
      withSpring(-8, { damping: 8, stiffness: 400 }),
      withSpring(0, { damping: 8, stiffness: 300 })
    );

    // Add a subtle animation to other tabs
    tabAnimations.forEach((anim, index) => {
      if (index !== tabIndex) {
        anim.value = withSequence(
          withTiming(2, { duration: 100 }),
          withSpring(0, { damping: 10, stiffness: 300 })
        );
      }
    });

    router.replace(route);
  }, [tabAnimations, selectorPosition, selectorScale]);

  const tabs = useMemo(() => [
    { route: '/', icon: 'home-outline', activeIcon: 'home' },
    { route: '/people', icon: 'people-outline', activeIcon: 'people' },
    { route: '/expenses', icon: 'receipt-outline', activeIcon: 'receipt' },
    { route: '/tools', icon: 'calculator-outline', activeIcon: 'calculator' },
    { route: '/settings', icon: 'settings-outline', activeIcon: 'settings' },
  ], []);

  // Find current tab index
  const currentTabIndex = useMemo(() => {
    return tabs.findIndex(tab => tab.route === pathname);
  }, [pathname, tabs]);

  // Update selector position when pathname changes (without animation for initial load)
  useEffect(() => {
    if (currentTabIndex >= 0) {
      selectorPosition.value = currentTabIndex;
    }
  }, [currentTabIndex, selectorPosition]);

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

  // FIXED: Move useAnimatedStyle outside of callback to fix React Hook rules
  const selectorAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      selectorPosition.value,
      [0, 1, 2, 3, 4],
      [0, 60, 120, 180, 240], // Adjust based on tab width
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX },
        { scale: selectorScale.value }
      ],
    };
  });

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
            position: 'relative',
          },
        ]}
      >
        {/* Animated selector background */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 8,
              left: 8,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: `${currentColors.primary}15`,
              borderWidth: 2,
              borderColor: `${currentColors.primary}30`,
            },
            selectorAnimatedStyle,
          ]}
        />

        {tabs.map((tab, index) => {
          const isActive = pathname === tab.route;
          const iconColor = isActive ? currentColors.primary : currentColors.text;

          // Animated style for each tab
          const tabAnimatedStyle = useAnimatedStyle(() => {
            return {
              transform: [
                { translateY: tabAnimations[index].value }
              ],
            };
          });

          return (
            <Animated.View key={tab.route} style={tabAnimatedStyle}>
              <TouchableOpacity
                style={[
                  themedStyles.floatingTabItem,
                  {
                    zIndex: 1, // Ensure tabs are above the selector
                  }
                ]}
                onPress={() => navigateToTab(tab.route, index)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={isActive ? (tab.activeIcon as any) : (tab.icon as any)} 
                  size={26} 
                  style={{ color: iconColor }} 
                />
              </TouchableOpacity>
            </Animated.View>
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
  
  // Force re-render state for safe area color updates
  const [safeAreaColorKey, setSafeAreaColorKey] = useState(0);

  useEffect(() => {
    setupErrorLogging();
  }, []);

  useEffect(() => {
    console.log('RootLayoutContent: Theme updated', { isDarkMode, themeMode, currentColors });
  }, [isDarkMode, themeMode, currentColors]);

  // Determine if this is the welcome page (first-time user experience)
  const isWelcomePage = useMemo(() => {
    // Welcome page is when user is on index route AND it's first-time user experience
    if (pathname !== '/') return false;
    
    // First-time user if no budgets exist or no active budget
    const hasNoBudgets = !appData || !appData.budgets || appData.budgets.length === 0;
    const hasNoActiveBudget = !activeBudget;
    
    // Also check if we have an active budget but no people/expenses (still welcome flow)
    let isFirstTimeUserWithBudget = false;
    if (activeBudget && data && !loading) {
      const people = data && data.people && Array.isArray(data.people) ? data.people : [];
      const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];
      isFirstTimeUserWithBudget = people.length === 0 && expenses.length === 0;
    }
    
    // Return true for the initial budget naming screen (no budgets exist)
    // OR when we have no active budget (after clearing data)
    const result = hasNoBudgets || hasNoActiveBudget;
    console.log('RootLayoutContent: isWelcomePage calculation', {
      pathname,
      hasNoBudgets,
      hasNoActiveBudget,
      isFirstTimeUserWithBudget,
      result,
      budgetsCount: appData?.budgets?.length || 0,
      activeBudgetId: activeBudget?.id || 'none',
      peopleCount: data?.people?.length || 0,
      expensesCount: data?.expenses?.length || 0,
      loading,
      refreshTrigger
    });
    
    return result;
  }, [pathname, appData, activeBudget, data, loading, refreshTrigger]);

  // Determine if we should show the "Budget Ready" or "You're almost ready" screen
  const isGuidanceScreen = useMemo(() => {
    // This covers both "Budget Ready" and "You're almost ready" screens
    // Both should use the header background color for the safe area
    if (pathname !== '/') return false;
    
    // Must have budgets and active budget
    if (!appData || !appData.budgets || appData.budgets.length === 0 || !activeBudget) return false;
    
    // Must have data loaded
    if (!data || loading) return false;
    
    const people = data && data.people && Array.isArray(data.people) ? data.people : [];
    const expenses = data && data.expenses && Array.isArray(data.expenses) ? data.expenses : [];
    
    // Guidance screens show when we have a budget but incomplete setup
    // This includes both "Budget Ready" (no people, no expenses) and "You're almost ready" (missing people OR expenses)
    const result = people.length === 0 || expenses.length === 0;
    
    console.log('RootLayoutContent: isGuidanceScreen calculation', {
      pathname,
      hasBudgets: appData.budgets.length > 0,
      hasActiveBudget: !!activeBudget,
      peopleCount: people.length,
      expensesCount: expenses.length,
      result,
      loading,
      refreshTrigger
    });
    
    return result;
  }, [pathname, appData, activeBudget, data, loading, refreshTrigger]);

  // Force re-render when welcome page or guidance screen state changes
  useEffect(() => {
    console.log('RootLayoutContent: Page state changed - Welcome:', isWelcomePage, 'GuidanceScreen:', isGuidanceScreen);
    // Force re-render by updating the key
    setSafeAreaColorKey(prev => prev + 1);
  }, [isWelcomePage, isGuidanceScreen]);

  // FIXED: Add appData to dependency array to fix exhaustive-deps warning
  useEffect(() => {
    console.log('RootLayoutContent: Budget data changed, refreshTrigger:', refreshTrigger);
    setSafeAreaColorKey(prev => prev + 1);
  }, [refreshTrigger, appData?.budgets?.length, activeBudget?.id, appData]);

  // Additional effect to handle the specific case of clearing all data
  useEffect(() => {
    // When budgets array becomes empty (cleared), ensure we're in welcome mode
    if (pathname === '/' && appData && appData.budgets && appData.budgets.length === 0) {
      console.log('RootLayoutContent: Detected cleared data state, forcing welcome page mode');
      setSafeAreaColorKey(prev => prev + 1);
      // Add a small delay to ensure the state has fully propagated
      setTimeout(() => {
        setSafeAreaColorKey(prev => prev + 1);
      }, 100);
    }
  }, [pathname, appData?.budgets?.length]);

  // Additional effect specifically for refreshTrigger changes (from clearAllData)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('RootLayoutContent: RefreshTrigger changed, forcing safe area color update');
      setSafeAreaColorKey(prev => prev + 1);
      // Force multiple updates to ensure the change takes effect
      setTimeout(() => setSafeAreaColorKey(prev => prev + 1), 50);
      setTimeout(() => setSafeAreaColorKey(prev => prev + 1), 150);
    }
  }, [refreshTrigger]);

  // Additional effect to watch for budget count changes (clearing data)
  useEffect(() => {
    const budgetCount = appData?.budgets?.length || 0;
    console.log('RootLayoutContent: Budget count changed to:', budgetCount);
    if (pathname === '/' && budgetCount === 0) {
      console.log('RootLayoutContent: Detected empty budgets on index route, forcing welcome color');
      setSafeAreaColorKey(prev => prev + 1);
    }
  }, [appData?.budgets?.length, pathname]);



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

  // Use page background color for safe zone only on welcome page, otherwise use header background color
  const safeZoneBackgroundColor = useMemo(() => {
    // Always use welcome page color (darker background) when:
    // 1. On the index route AND no budgets exist (first-time user or after clearing data)
    // 2. OR when explicitly determined to be welcome page
    const isOnIndexRoute = pathname === '/';
    const noBudgetsExist = !appData || !appData.budgets || appData.budgets.length === 0;
    const shouldUseWelcomeColor = isOnIndexRoute && (noBudgetsExist || isWelcomePage);
    
    // For the "Budget Ready" page and "You're almost ready" page, we should use the header background color (backgroundAlt)
    // This matches the header color on those screens
    const shouldUseHeaderColor = isOnIndexRoute && (isGuidanceScreen || (!noBudgetsExist && !isWelcomePage));
    
    let color;
    if (shouldUseWelcomeColor) {
      color = currentColors.background; // Dark background for welcome page
    } else if (shouldUseHeaderColor) {
      color = currentColors.backgroundAlt; // Header background for budget ready page and other index screens
    } else {
      color = currentColors.backgroundAlt; // Default header background for other pages
    }
    
    console.log('RootLayoutContent: Safe zone background color calculation', {
      isOnIndexRoute,
      noBudgetsExist,
      isWelcomePage,
      isGuidanceScreen,
      shouldUseWelcomeColor,
      shouldUseHeaderColor,
      color,
      backgroundMain: currentColors.background,
      backgroundAlt: currentColors.backgroundAlt,
      pathname,
      budgetsCount: appData?.budgets?.length || 0,
      safeAreaColorKey,
      refreshTrigger
    });
    
    return color;
  }, [isWelcomePage, isGuidanceScreen, currentColors.background, currentColors.backgroundAlt, pathname, safeAreaColorKey, refreshTrigger, appData]);

  return (
    // Outer wrapper paints the top safe area with conditional background color
    // Key ensures re-render when welcome page state changes
    <View key={`safe-area-${safeAreaColorKey}-${isWelcomePage ? 'welcome' : isGuidanceScreen ? 'guidance' : 'normal'}-${appData?.budgets?.length || 0}`} style={{ flex: 1, backgroundColor: safeZoneBackgroundColor }}>
      {/* Status bar matches page background color only on welcome page, otherwise header background */}
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
