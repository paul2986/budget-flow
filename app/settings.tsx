
import { Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import Button from '../components/Button';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { data, updateHouseholdSettings, clearAllData } = useBudgetData();
  const { currentColors, themeMode, setThemeMode, isDarkMode } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { currency, setCurrency } = useCurrency();

  const handleDistributionMethodChange = async (method: 'even' | 'income-based') => {
    try {
      const result = await updateHouseholdSettings({ distributionMethod: method });
      if (!result.success) {
        Alert.alert('Error', 'Failed to update household expense distribution method.');
      }
    } catch (error) {
      console.error('Settings: Error updating distribution method:', error);
      Alert.alert('Error', 'An unexpected error occurred while updating the distribution method.');
    }
  };

  const handleThemeChange = async (newTheme: 'system' | 'light' | 'dark') => {
    try {
      await setThemeMode(newTheme);
    } catch (error) {
      console.error('Settings: Error changing theme:', error);
      Alert.alert('Error', 'Failed to change theme.');
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all data? This action cannot be undone.\n\nThis will permanently remove:\n• All people and their income information\n• All expenses (personal and household)\n• All settings will be reset to defaults',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await clearAllData();
              if (!result.success) {
                Alert.alert('Error', 'Failed to clear all data. Please try again.');
              }
            } catch (error) {
              console.error('Settings: Error clearing data:', error);
              Alert.alert('Error', 'An unexpected error occurred while clearing data.');
            }
          },
        },
      ]
    );
  };

  const handleCurrencyChange = (curr: typeof CURRENCIES[0]) => {
    setCurrency(curr);
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader title="Settings" showLeftIcon={false} showRightIcon={false} />

      <ScrollView style={themedStyles.content} contentContainerStyle={themedStyles.scrollContent}>
        {/* Theme Settings */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.subtitle}>Appearance</Text>

          <View style={themedStyles.card}>
            <Text style={[themedStyles.text, { marginBottom: 12 }]}>
              Choose your preferred theme (Current: {themeMode}, Dark Mode: {isDarkMode ? 'Yes' : 'No'})
            </Text>

            {[
              { key: 'system', label: 'System Default', icon: 'phone-portrait-outline' },
              { key: 'light', label: 'Light Mode', icon: 'sunny-outline' },
              { key: 'dark', label: 'Dark Mode', icon: 'moon-outline' },
            ].map((theme) => (
              <TouchableOpacity
                key={theme.key}
                style={[
                  themedStyles.card,
                  {
                    backgroundColor: themeMode === theme.key ? currentColors.primary + '20' : currentColors.border + '20',
                    borderWidth: 2,
                    borderColor: themeMode === theme.key ? currentColors.primary : currentColors.border,
                    marginBottom: 8,
                  },
                ]}
                onPress={() => handleThemeChange(theme.key as any)}
              >
                <View style={themedStyles.rowStart}>
                  <Icon
                    name={themeMode === theme.key ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    style={{ color: themeMode === theme.key ? currentColors.primary : currentColors.textSecondary, marginRight: 12 }}
                  />
                  <Icon name={theme.icon as any} size={20} style={{ color: currentColors.text, marginRight: 12 }} />
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>{theme.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Currency Settings */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.subtitle}>Currency</Text>

          <View style={themedStyles.card}>
            <Text style={[themedStyles.text, { marginBottom: 12 }]}>
              Current: {currency.name} ({currency.symbol})
            </Text>

            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    themedStyles.row,
                    {
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: currentColors.border,
                    },
                  ]}
                  onPress={() => handleCurrencyChange(curr)}
                >
                  <View style={themedStyles.rowStart}>
                    <Icon
                      name={currency.code === curr.code ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      style={{ color: currency.code === curr.code ? currentColors.primary : currentColors.textSecondary, marginRight: 12 }}
                    />
                    <View>
                      <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                        {curr.symbol} {curr.code}
                      </Text>
                      <Text style={themedStyles.textSecondary}>{curr.name}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Household Distribution Settings */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.subtitle}>Household Expense Distribution</Text>

          <View style={themedStyles.card}>
            <Text style={[themedStyles.text, { marginBottom: 12 }]}>How should household expenses be split among people?</Text>

            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: data.householdSettings.distributionMethod === 'even' ? currentColors.primary + '20' : currentColors.border + '20',
                  borderWidth: 2,
                  borderColor: data.householdSettings.distributionMethod === 'even' ? currentColors.primary : currentColors.border,
                  marginBottom: 12,
                },
              ]}
              onPress={() => handleDistributionMethodChange('even')}
            >
              <View style={themedStyles.rowStart}>
                <Icon
                  name={data.householdSettings.distributionMethod === 'even' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  style={{ color: data.householdSettings.distributionMethod === 'even' ? currentColors.primary : currentColors.textSecondary, marginRight: 12 }}
                />
                <View style={themedStyles.flex1}>
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>Even Split</Text>
                  <Text style={themedStyles.textSecondary}>Each person pays an equal share of household expenses</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: data.householdSettings.distributionMethod === 'income-based' ? currentColors.primary + '20' : currentColors.border + '20',
                  borderWidth: 2,
                  borderColor: data.householdSettings.distributionMethod === 'income-based' ? currentColors.primary : currentColors.border,
                },
              ]}
              onPress={() => handleDistributionMethodChange('income-based')}
            >
              <View style={themedStyles.rowStart}>
                <Icon
                  name={data.householdSettings.distributionMethod === 'income-based' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  style={{ color: data.householdSettings.distributionMethod === 'income-based' ? currentColors.primary : currentColors.textSecondary, marginRight: 12 }}
                />
                <View style={themedStyles.flex1}>
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>Income-Based Split</Text>
                  <Text style={themedStyles.textSecondary}>Each person pays proportionally based on their income</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.subtitle}>Categories</Text>
          <View style={themedStyles.card}>
            <Text style={[themedStyles.text, { marginBottom: 12 }]}>Manage your expense categories.</Text>
            <TouchableOpacity
              style={[
                themedStyles.card,
                {
                  backgroundColor: currentColors.secondary + '15',
                  borderColor: currentColors.secondary + '30',
                  borderWidth: 2,
                  marginBottom: 0,
                  padding: 12,
                },
              ]}
              onPress={() => router.push('/manage-categories')}
            >
              <View style={[themedStyles.row, { alignItems: 'center' }]}>
                <Icon name="pricetags-outline" size={20} style={{ color: currentColors.secondary, marginRight: 8 }} />
                <View style={themedStyles.flex1}>
                  <Text style={[themedStyles.text, { fontWeight: '700' }]}>Manage Categories</Text>
                  <Text style={themedStyles.textSecondary}>View defaults and remove custom categories</Text>
                </View>
                <Icon name="chevron-forward" size={20} style={{ color: currentColors.secondary }} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Summary */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.subtitle}>Data Summary</Text>

          <View style={themedStyles.card}>
            <View style={[themedStyles.row, { marginBottom: 8 }]}>
              <Text style={themedStyles.text}>People:</Text>
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>{data.people.length}</Text>
            </View>
            <View style={[themedStyles.row, { marginBottom: 8 }]}>
              <Text style={themedStyles.text}>Total Expenses:</Text>
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>{data.expenses.length}</Text>
            </View>
            <View style={themedStyles.row}>
              <Text style={themedStyles.text}>Distribution Method:</Text>
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>{data.householdSettings.distributionMethod === 'even' ? 'Even Split' : 'Income-Based'}</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={themedStyles.section}>
          <Text style={[themedStyles.subtitle, { color: currentColors.error }]}>Danger Zone</Text>

          <View style={[themedStyles.card, { borderColor: currentColors.error, borderWidth: 1 }]}>
            <Text style={[themedStyles.text, { marginBottom: 12 }]}>
              This will permanently delete all your data including people, income, and expenses. This action cannot be undone.
            </Text>

            <Button
              text="Clear All Data"
              onPress={handleClearAllData}
              style={[themedButtonStyles.danger, { backgroundColor: currentColors.error, borderColor: currentColors.error }]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
