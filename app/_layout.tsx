
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, SafeAreaView, View, TouchableOpacity, Text } from 'react-native';
import { useEffect, useCallback, useMemo } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { router, usePathname } from 'expo-router';
import Icon from '../components/Icon';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';

const STORAGE_KEY = 'emulated_device';

function CustomTabBar() {
  const pathname = usePathname();
  const { isDarkMode, currentColors, themeMode } = useTheme();
  const { themedStyles } = useThemedStyles();
  const insets = useSafeAreaInsets();

  // Add debug logging for theme changes
  useEffect(() => {
    console.log('CustomTabBar: Theme changed', {
      isDarkMode,
      themeMode,
      backgroundAlt: currentColors.backgroundAlt,
      primary: currentColors.primary,
      textSecondary: currentColors.textSecondary
    });
  }, [isDarkMode, themeMode, currentColors]);

  const navItems = useMemo(() => [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/' },
    { name: 'Expenses', icon: 'receipt-outline', activeIcon: 'receipt', route: '/expenses' },
    { name: 'People', icon: 'people-outline', activeIcon: 'people', route: '/people' },
    { name: 'Settings', icon: 'settings-outline', activeIcon: 'settings', route: '/settings' },
  ], []);

  const handleNavigation = useCallback((route: string) => {
    console.log('CustomTabBar: Navigating to:', route);
    router.replace(route);
  }, []);

  // Memoize the tab bar style to ensure it updates when theme changes
  const tabBarStyle = useMemo(() => ({
    flexDirection: 'row' as const,
    backgroundColor: currentColors.backgroundAlt,
    borderTopWidth: 1,
    borderTopColor: currentColors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: insets.bottom,
    elevation: 8,
    shadowColor: isDarkMode ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: isDarkMode ? 0.4 : 0.1,
    shadowRadius: 8,
  }), [currentColors.backgroundAlt, currentColors.border, insets.bottom, isDarkMode]);

  // Pre-calculate styles for active and inactive states
  const getButtonStyle = useCallback((isActive: boolean) => ({
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: isActive ? currentColors.primary + (isDarkMode ? '30' : '15') : 'transparent',
  }), [currentColors.primary, isDarkMode]);

  const getIconColor = useCallback((isActive: boolean) => 
    isActive ? currentColors.primary : currentColors.textSecondary,
    [currentColors.primary, currentColors.textSecondary]
  );

  return (
    <View style={tabBarStyle}>
      {navItems.map((item) => {
        const isActive = pathname === item.route;
        const buttonStyle = getButtonStyle(isActive);
        const iconColor = getIconColor(isActive);

        return (
          <TouchableOpacity
            key={item.route}
            style={buttonStyle}
            onPress={() => handleNavigation(item.route)}
            activeOpacity={0.7}
          >
            <Icon
              name={isActive ? item.activeIcon : item.icon}
              size={28}
              style={{ color: iconColor }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RootLayout() {
  const actualInsets = useSafeAreaInsets();
  const { isDarkMode, currentColors, themeMode } = useTheme();
  const { themedStyles } = useThemedStyles();

  // Add debug logging for theme changes in root layout
  useEffect(() => {
    console.log('RootLayout: Theme changed', {
      isDarkMode,
      themeMode,
      background: currentColors.background,
      backgroundAlt: currentColors.backgroundAlt
    });
  }, [isDarkMode, themeMode, currentColors]);

  useEffect(() => {
    // Set up global error logging
    setupErrorLogging();
  }, []);

  let insetsToUse = actualInsets;

  if (Platform.OS === 'web') {
    const simulatedInsets = {
      ios: { top: 47, bottom: 20, left: 0, right: 0 },
      android: { top: 40, bottom: 0, left: 0, right: 0 },
    };

    // Check for device emulation in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const emulate = urlParams.get('emulate');
    
    if (emulate) {
      localStorage.setItem(STORAGE_KEY, emulate);
    }
    
    const deviceToEmulate = emulate || localStorage.getItem(STORAGE_KEY);
    insetsToUse = deviceToEmulate ? simulatedInsets[deviceToEmulate as keyof typeof simulatedInsets] || actualInsets : actualInsets;
  }

  // Memoize the wrapper style to ensure it updates when theme changes
  const wrapperStyle = useMemo(() => ([
    themedStyles.wrapper,
    {
      paddingTop: 0,
      paddingLeft: insetsToUse.left,
      paddingRight: insetsToUse.right,
      paddingBottom: 0,
    }
  ]), [themedStyles.wrapper, insetsToUse.left, insetsToUse.right]);

  // Memoize the top safe area style
  const topSafeAreaStyle = useMemo(() => ({ 
    height: insetsToUse.top, 
    backgroundColor: currentColors.backgroundAlt 
  }), [insetsToUse.top, currentColors.backgroundAlt]);

  // Memoize the main container style
  const mainContainerStyle = useMemo(() => ({ 
    flex: 1, 
    backgroundColor: currentColors.background 
  }), [currentColors.background]);

  // Create a memoized CustomTabBar component that will re-render when theme changes
  const MemoizedCustomTabBar = useCallback(() => <CustomTabBar />, []);

  return (
    <SafeAreaProvider>
      <View style={wrapperStyle}>
        <StatusBar 
          style={isDarkMode ? "light" : "dark"} 
          backgroundColor={currentColors.backgroundAlt}
          translucent={false}
        />
        {/* Top safe area with header background color that matches theme */}
        <View style={topSafeAreaStyle} />
        <View style={mainContainerStyle}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' }, // Hide the default tab bar
            }}
            tabBar={MemoizedCustomTabBar}
          >
            <Tabs.Screen 
              name="index" 
              options={{ 
                title: 'Home',
                href: '/',
              }} 
            />
            <Tabs.Screen 
              name="expenses" 
              options={{ 
                title: 'Expenses',
                href: '/expenses',
              }} 
            />
            <Tabs.Screen 
              name="people" 
              options={{ 
                title: 'People',
                href: '/people',
              }} 
            />
            <Tabs.Screen 
              name="settings" 
              options={{ 
                title: 'Settings',
                href: '/settings',
              }} 
            />
            <Tabs.Screen 
              name="add-expense" 
              options={{ 
                title: 'Add Expense',
                href: null, // This makes it not appear in tabs but still accessible via navigation
              }} 
            />
            <Tabs.Screen 
              name="edit-person" 
              options={{ 
                title: 'Edit Person',
                href: null, // This makes it not appear in tabs but still accessible via navigation
              }} 
            />
            <Tabs.Screen 
              name="edit-income" 
              options={{ 
                title: 'Edit Income',
                href: null, // This makes it not appear in tabs but still accessible via navigation
              }} 
            />
          </Tabs>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
