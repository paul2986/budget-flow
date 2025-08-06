
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

  // Modern floating tab bar style - moved down more significantly
  const tabBarContainerStyle = useMemo(() => ({
    position: 'absolute' as const,
    bottom: 8, // Moved down from 12 to 8 for more distance from bottom
    left: 20,   // Equal distance from left
    right: 20,  // Equal distance from right
    paddingBottom: insets.bottom > 0 ? insets.bottom - 8 : 4, // Adjusted for moving down more
  }), [insets.bottom]);

  const tabBarStyle = useMemo(() => ({
    flexDirection: 'row' as const,
    backgroundColor: currentColors.backgroundAlt,
    borderRadius: 28, // More rounded for modern iOS look
    paddingVertical: 16, // Increased padding for better icon centering
    paddingHorizontal: 20,
    elevation: 12,
    shadowColor: isDarkMode ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.6 : 0.15,
    shadowRadius: 16,
    // Add subtle border for definition
    borderWidth: isDarkMode ? 0 : 0.5,
    borderColor: isDarkMode ? 'transparent' : currentColors.border,
    // Add backdrop blur effect simulation
    opacity: 0.95,
    height: 64, // Increased height for better icon centering
  }), [currentColors.backgroundAlt, currentColors.border, isDarkMode]);

  // Pre-calculate styles for active and inactive states - properly centered icons
  const getButtonStyle = useCallback((isActive: boolean) => ({
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16, // Increased padding for proper centering
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: isActive ? currentColors.primary + (isDarkMode ? '25' : '12') : 'transparent',
    height: 52, // Fixed height for consistency - properly centered
  }), [currentColors.primary, isDarkMode]);

  const getIconColor = useCallback((isActive: boolean) => 
    isActive ? currentColors.primary : currentColors.textSecondary,
    [currentColors.primary, currentColors.textSecondary]
  );

  return (
    <View style={tabBarContainerStyle}>
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
                size={26} // Slightly larger since no labels
                style={{ color: iconColor }}
              />
              {/* Removed Text component - no labels */}
            </TouchableOpacity>
          );
        })}
      </View>
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
            tabBar={() => <CustomTabBar />}
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
