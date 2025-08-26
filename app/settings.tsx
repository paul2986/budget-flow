
import { useTheme } from '../hooks/useTheme';
import Button from '../components/Button';
import { Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import { useBudgetData } from '../hooks/useBudgetData';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import StandardHeader from '../components/StandardHeader';

export default function SettingsScreen() {
  const { currentColors, themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { appData, data, clearAllData } = useBudgetData();
  const { themedStyles } = useThemedStyles();
  const { showToast } = useToast();

  const handleDistributionMethodChange = (method: 'even' | 'income-based') => {
    // This would need to be implemented in useBudgetData if needed
    console.log('Distribution method change:', method);
    showToast(`Distribution method changed to ${method}`, 'success');
  };

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setThemeMode(newTheme);
    showToast(`Theme changed to ${newTheme}`, 'success');
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your budgets, people, and expenses. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              showToast('All data cleared successfully', 'success');
              // Navigate back to home screen to show first-time user experience
              router.replace('/');
            } catch (error) {
              console.error('Settings: Clear data error:', error);
              showToast('Failed to clear data', 'error');
            }
          },
        },
      ]
    );
  };

  const handleCurrencyChange = (curr: typeof CURRENCIES[0]) => {
    setCurrency(curr);
    showToast(`Currency changed to ${curr.name}`, 'success');
  };

  return (
    <View style={[themedStyles.container, { backgroundColor: currentColors.background }]}>
      <StandardHeader 
        title="Settings" 
        showLeftIcon={false}
        showRightIcon={false}
      />

      <ScrollView style={themedStyles.content} contentContainerStyle={[themedStyles.scrollContent, { paddingHorizontal: 0, paddingTop: 16 }]}>
        {/* App Info */}
        <View style={[themedStyles.card, { marginBottom: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Icon name="wallet-outline" size={24} style={{ color: currentColors.primary, marginRight: 12 }} />
            <Text style={[themedStyles.subtitle, { flex: 1 }]}>Budget Flow</Text>
          </View>
          <Text style={themedStyles.textSecondary}>
            Offline-first budget tracking app
          </Text>
        </View>

        {/* Budgets */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
            onPress={() => router.push('/budgets')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="folder-outline" size={20} style={{ color: currentColors.text, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Manage Budgets</Text>
                <Text style={themedStyles.textSecondary}>
                  {appData?.budgets?.length || 0} budget{(appData?.budgets?.length || 0) !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
            onPress={() => router.push('/manage-categories')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="pricetags-outline" size={20} style={{ color: currentColors.text, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Manage Categories</Text>
                <Text style={themedStyles.textSecondary}>
                  Customize expense categories
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Currency */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <Text style={[themedStyles.text, { fontWeight: '600', marginBottom: 12 }]}>Currency</Text>
          {CURRENCIES.map((curr) => (
            <TouchableOpacity
              key={curr.code}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: curr.code === CURRENCIES[CURRENCIES.length - 1].code ? 0 : 1,
                borderBottomColor: currentColors.border,
              }}
              onPress={() => handleCurrencyChange(curr)}
            >
              <Text style={themedStyles.text}>
                {curr.symbol} {curr.name} ({curr.code})
              </Text>
              {currency.code === curr.code && (
                <Icon name="checkmark" size={20} style={{ color: currentColors.primary }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Theme */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <Text style={[themedStyles.text, { fontWeight: '600', marginBottom: 12 }]}>Theme</Text>
          {[
            { key: 'system', label: 'System' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ].map((theme) => (
            <TouchableOpacity
              key={theme.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: theme.key === 'dark' ? 0 : 1,
                borderBottomColor: currentColors.border,
              }}
              onPress={() => handleThemeChange(theme.key as any)}
            >
              <Text style={themedStyles.text}>{theme.label}</Text>
              {themeMode === theme.key && (
                <Icon name="checkmark" size={20} style={{ color: currentColors.primary }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tools */}
        <View style={[themedStyles.card, { marginBottom: 16 }]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
            }}
            onPress={() => router.push('/tools')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="calculator-outline" size={20} style={{ color: currentColors.text, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontWeight: '600' }]}>Financial Tools</Text>
                <Text style={themedStyles.textSecondary}>
                  Credit card payoff calculator
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: currentColors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[
          themedStyles.card, 
          { 
            marginBottom: 24,
            borderColor: currentColors.error + '40',
            borderWidth: 2,
            backgroundColor: currentColors.error + '08'
          }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Icon name="warning" size={24} style={{ color: currentColors.error, marginRight: 12 }} />
            <Text style={[themedStyles.text, { fontWeight: '700', color: currentColors.error, fontSize: 18 }]}>
              Danger Zone
            </Text>
          </View>
          
          <Text style={[themedStyles.textSecondary, { marginBottom: 16, lineHeight: 20 }]}>
            This action will permanently delete all your data. This cannot be undone.
          </Text>
          
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: currentColors.error,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: currentColors.error,
            }}
            onPress={handleClearAllData}
          >
            <Icon name="trash" size={20} style={{ color: currentColors.background, marginRight: 8 }} />
            <Text style={[themedStyles.text, { color: currentColors.background, fontWeight: '700' }]}>
              Clear All Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[themedStyles.card, { backgroundColor: currentColors.backgroundAlt }]}>
          <Text style={[themedStyles.textSecondary, { fontSize: 12, textAlign: 'center', lineHeight: 18 }]}>
            Budget Flow v1.0.0{'\n'}
            Offline-first budget tracking{'\n'}
            No accounts required
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
