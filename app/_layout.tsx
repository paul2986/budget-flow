
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, SafeAreaView, View, TouchableOpacity, Text } from 'react-native';
import { commonStyles, colors, darkColors } from '../styles/commonStyles';
import { useEffect, useCallback } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { router, usePathname } from 'expo-router';
import Icon from '../components/Icon';
import { useTheme } from '../hooks/useTheme';

const STORAGE_KEY = 'emulated_device';

function CustomTabBar() {
  const pathname = usePathname();
  const { isDarkMode, currentColors } = useTheme();

  const navItems = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/' },
    { name: 'Expenses', icon: 'receipt-outline', activeIcon: 'receipt', route: '/expenses' },
    { name: 'People', icon: 'people-outline', activeIcon: 'people', route: '/people' },
    { name: 'Settings', icon: 'settings-outline', activeIcon: 'settings', route: '/settings' },
  ];

  const handleNavigation = useCallback((route: string) => {
    console.log('CustomTabBar: Navigating to:', route);
    router.replace(route);
  }, []);

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: currentColors.backgroundAlt,
      borderTopWidth: 1,
      borderTopColor: currentColors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    }}>
      {navItems.map((item) => {
        const isActive = pathname === item.route;
        return (
          <TouchableOpacity
            key={item.route}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 4,
              borderRadius: 12,
              backgroundColor: isActive ? currentColors.primary + '15' : 'transparent',
            }}
            onPress={() => handleNavigation(item.route)}
            activeOpacity={0.7}
          >
            <Icon
              name={isActive ? item.activeIcon : item.icon}
              size={24}
              style={{ 
                color: isActive ? currentColors.primary : currentColors.textSecondary,
                marginBottom: 4 
              }}
            />
            <Text style={{
              fontSize: 12,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? currentColors.primary : currentColors.textSecondary,
            }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RootLayout() {
  const actualInsets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[commonStyles.wrapper, {
          paddingTop: insetsToUse.top,
          paddingLeft: insetsToUse.left,
          paddingRight: insetsToUse.right,
       }]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View style={{ flex: 1 }}>
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
          </Tabs>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
