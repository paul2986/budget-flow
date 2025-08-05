
import { Stack, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, SafeAreaView, View, TouchableOpacity, Text, useColorScheme } from 'react-native';
import { commonStyles, colors, darkColors } from '../styles/commonStyles';
import { useEffect, useState } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { router, usePathname } from 'expo-router';
import Icon from '../components/Icon';
import { useTheme } from '../hooks/useTheme';

const STORAGE_KEY = 'emulated_device';

function BottomNavigation() {
  const pathname = usePathname();
  const { isDarkMode, currentColors } = useTheme();

  const navItems = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/' },
    { name: 'Expenses', icon: 'receipt-outline', activeIcon: 'receipt', route: '/expenses' },
    { name: 'People', icon: 'people-outline', activeIcon: 'people', route: '/people' },
    { name: 'Settings', icon: 'settings-outline', activeIcon: 'settings', route: '/settings' },
  ];

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
            onPress={() => router.push(item.route)}
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
  const { emulate } = useGlobalSearchParams<{ emulate?: string }>();
  const [storedEmulate, setStoredEmulate] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    // Set up global error logging
    setupErrorLogging();

    if (Platform.OS === 'web') {
      // If there's a new emulate parameter, store it
      if (emulate) {
        localStorage.setItem(STORAGE_KEY, emulate);
        setStoredEmulate(emulate);
      } else {
        // If no emulate parameter, try to get from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setStoredEmulate(stored);
        }
      }
    }
  }, [emulate]);

  let insetsToUse = actualInsets;

  if (Platform.OS === 'web') {
    const simulatedInsets = {
      ios: { top: 47, bottom: 20, left: 0, right: 0 },
      android: { top: 40, bottom: 0, left: 0, right: 0 },
    };

    // Use stored emulate value if available, otherwise use the current emulate parameter
    const deviceToEmulate = storedEmulate || emulate;
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
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'default',
            }}
          />
          <BottomNavigation />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
