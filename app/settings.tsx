
import { Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import { useToast } from '../hooks/useToast';
import Button from '../components/Button';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';

export default function SettingsScreen() {
  const { data, updateHouseholdSettings, clearAllData } = useBudgetData();
  const { currentColors, themeMode, setThemeMode, isDarkMode } = useTheme();
  const { themedStyles, themedButtonStyles } = useThemedStyles();
  const { currency, setCurrency } = useCurrency();
  const { showToast } = useToast();

  const handleDistributionMethodChange = async (method: 'even' | 'income-based') => {
    console.log('Settings: Changing distribution method to:', method);
    console.log('Settings: Current data before change:', {
      peopleCount: data.people.length,
      expensesCount: data.expenses.length,
      currentMethod: data.householdSettings.distributionMethod
    });
    
    try {
      // Only update the distribution method, preserve all other data
      const result = await updateHouseholdSettings({ distributionMethod: method });
      
      if (result.success) {
        console.log('Settings: Distribution method updated successfully');
        showToast('Household expense distribution method updated!', 'success');
      } else {
        console.error('Settings: Failed to update distribution method:', result.error);
        showToast('Failed to update household expense distribution method.', 'error');
      }
    } catch (error) {
      console.error('Settings: Error updating distribution method:', error);
      showToast('An unexpected error occurred while updating the distribution method.', 'error');
    }
  };

  const handleThemeChange = async (newTheme: 'system' | 'light' | 'dark') => {
    console.log('Settings: Changing theme from', themeMode, 'to', newTheme);
    try {
      await setThemeMode(newTheme);
      console.log('Settings: Theme change completed');
      showToast(`Theme changed to ${newTheme === 'system' ? 'system default' : newTheme + ' mode'}!`, 'success');
    } catch (error) {
      console.error('Settings: Error changing theme:', error);
      showToast('Failed to change theme.', 'error');
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all data? This action cannot be undone.\n\nThis will permanently remove:\n• All people and their income information\n• All expenses (personal and household)\n• All settings will be reset to defaults',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        { 
          text: 'Clear All Data', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Settings: Clearing all data...');
              console.log('Settings: Current data before clearing:', {
                peopleCount: data.people.length,
                expensesCount: data.expenses.length,
                distributionMethod: data.householdSettings.distributionMethod
              });
              
              // Use the clearAllData function from useBudgetData
              const result = await clearAllData();
              
              if (result.success) {
                console.log('Settings: All data cleared successfully');
                showToast('All data has been cleared successfully!', 'success');
              } else {
                console.error('Settings: Failed to clear data:', result.error);
                showToast('Failed to clear all data. Please try again.', 'error');
              }
            } catch (error) {
              console.error('Settings: Error clearing data:', error);
              showToast('An unexpected error occurred while clearing data.', 'error');
            }
          }
        },
      ]
    );
  };

  const handleCurrencyChange = (curr: typeof CURRENCIES[0]) => {
    console.log('Settings: Changing currency to:', curr);
    setCurrency(curr);
    showToast(`Currency changed to ${curr.name} (${curr.symbol})!`, 'success');
  };

  return (
    <View style={themedStyles.container}>
      <StandardHeader
        title="Settings"
        showLeftIcon={false}
        showRightIcon={false}
      />

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
                    backgroundColor: themeMode === theme.key 
                      ? currentColors.primary + '20' 
                      : currentColors.border + '20',
                    borderWidth: 2,
                    borderColor: themeMode === theme.key 
                      ? currentColors.primary 
                      : currentColors.border,
                    marginBottom: 8,
                  }
                ]}
                onPress={() => handleThemeChange(theme.key as any)}
              >
                <View style={themedStyles.rowStart}>
                  <Icon 
                    name={themeMode === theme.key ? 'radio-button-on' : 'radio-button-off'} 
                    size={20} 
                    style={{ 
                      color: themeMode === theme.key ? currentColors.primary : currentColors.textSecondary,
                      marginRight: 12 
                    }} 
                  />
                  <Icon 
                    name={theme.icon} 
                    size={20} 
                    style={{ 
                      color: currentColors.text,
                      marginRight: 12 
                    }} 
                  />
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                    {theme.label}
                  </Text>
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
                    }
                  ]}
                  onPress={() => handleCurrencyChange(curr)}
                >
                  <View style={themedStyles.rowStart}>
                    <Icon 
                      name={currency.code === curr.code ? 'radio-button-on' : 'radio-button-off'} 
                      size={20} 
                      style={{ 
                        color: currency.code === curr.code ? currentColors.primary : currentColors.textSecondary,
                        marginRight: 12 
                      }} 
                    />
                    <View>
                      <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                        {curr.symbol} {curr.code}
                      </Text>
                      <Text style={themedStyles.textSecondary}>
                        {curr.name}
                      </Text>
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
            <Text style={[themedStyles.text, { marginBottom: 12 }]}>
              How should household expenses be split among people?
            </Text>
            
            <TouchableOpacity
              style={[
                themedStyles.card,
                { 
                  backgroundColor: data.householdSettings.distributionMethod === 'even' 
                    ? currentColors.primary + '20' 
                    : currentColors.border + '20',
                  borderWidth: 2,
                  borderColor: data.householdSettings.distributionMethod === 'even' 
                    ? currentColors.primary 
                    : currentColors.border,
                  marginBottom: 12,
                }
              ]}
              onPress={() => handleDistributionMethodChange('even')}
            >
              <View style={themedStyles.rowStart}>
                <Icon 
                  name={data.householdSettings.distributionMethod === 'even' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  style={{ 
                    color: data.householdSettings.distributionMethod === 'even' ? currentColors.primary : currentColors.textSecondary,
                    marginRight: 12 
                  }} 
                />
                <View style={themedStyles.flex1}>
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>Even Split</Text>
                  <Text style={themedStyles.textSecondary}>
                    Each person pays an equal share of household expenses
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                themedStyles.card,
                { 
                  backgroundColor: data.householdSettings.distributionMethod === 'income-based' 
                    ? currentColors.primary + '20' 
                    : currentColors.border + '20',
                  borderWidth: 2,
                  borderColor: data.householdSettings.distributionMethod === 'income-based' 
                    ? currentColors.primary 
                    : currentColors.border,
                }
              ]}
              onPress={() => handleDistributionMethodChange('income-based')}
            >
              <View style={themedStyles.rowStart}>
                <Icon 
                  name={data.householdSettings.distributionMethod === 'income-based' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  style={{ 
                    color: data.householdSettings.distributionMethod === 'income-based' ? currentColors.primary : currentColors.textSecondary,
                    marginRight: 12 
                  }} 
                />
                <View style={themedStyles.flex1}>
                  <Text style={[themedStyles.text, { fontWeight: '600' }]}>Income-Based Split</Text>
                  <Text style={themedStyles.textSecondary}>
                    Each person pays proportionally based on their income
                  </Text>
                </View>
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
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                {data.people.length}
              </Text>
            </View>
            <View style={[themedStyles.row, { marginBottom: 8 }]}>
              <Text style={themedStyles.text}>Total Expenses:</Text>
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                {data.expenses.length}
              </Text>
            </View>
            <View style={themedStyles.row}>
              <Text style={themedStyles.text}>Distribution Method:</Text>
              <Text style={[themedStyles.text, { fontWeight: '600' }]}>
                {data.householdSettings.distributionMethod === 'even' ? 'Even Split' : 'Income-Based'}
              </Text>
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
              style={[themedButtonStyles.danger, { backgroundColor: currentColors.error }]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
