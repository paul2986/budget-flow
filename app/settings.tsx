
import { Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { commonStyles, buttonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function SettingsScreen() {
  const { data, updateHouseholdSettings } = useBudgetData();
  const { currentColors, themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency } = useCurrency();

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
      } else {
        console.error('Settings: Failed to update distribution method:', result.error);
        Alert.alert('Error', 'Failed to update household expense distribution method.');
      }
    } catch (error) {
      console.error('Settings: Error updating distribution method:', error);
      Alert.alert('Error', 'An unexpected error occurred while updating the distribution method.');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Settings: Clearing all data...');
              
              // Reset to empty data structure
              const emptyData = {
                people: [],
                expenses: [],
                householdSettings: { distributionMethod: 'even' as const },
              };
              
              // Use the updateHouseholdSettings to clear everything
              const result = await updateHouseholdSettings(emptyData.householdSettings);
              
              if (result.success) {
                console.log('Settings: All data cleared successfully');
                Alert.alert('Success', 'All data has been cleared.');
              } else {
                console.error('Settings: Failed to clear data:', result.error);
                Alert.alert('Error', 'Failed to clear all data.');
              }
            } catch (error) {
              console.error('Settings: Error clearing data:', error);
              Alert.alert('Error', 'An unexpected error occurred while clearing data.');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
        <View style={{ width: 24 }} />
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Theme Settings */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Appearance</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <Text style={[commonStyles.text, { marginBottom: 12, color: currentColors.text }]}>
              Choose your preferred theme
            </Text>
            
            {[
              { key: 'system', label: 'System Default', icon: 'phone-portrait-outline' },
              { key: 'light', label: 'Light Mode', icon: 'sunny-outline' },
              { key: 'dark', label: 'Dark Mode', icon: 'moon-outline' },
            ].map((theme) => (
              <TouchableOpacity
                key={theme.key}
                style={[
                  commonStyles.card,
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
                onPress={() => setThemeMode(theme.key as any)}
              >
                <View style={commonStyles.rowStart}>
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
                  <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                    {theme.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Currency Settings */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Currency</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <Text style={[commonStyles.text, { marginBottom: 12, color: currentColors.text }]}>
              Current: {currency.name} ({currency.symbol})
            </Text>
            
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    commonStyles.row,
                    { 
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: currentColors.border,
                    }
                  ]}
                  onPress={() => {
                    console.log('Settings: Changing currency to:', curr);
                    setCurrency(curr);
                  }}
                >
                  <View style={commonStyles.rowStart}>
                    <Icon 
                      name={currency.code === curr.code ? 'radio-button-on' : 'radio-button-off'} 
                      size={20} 
                      style={{ 
                        color: currency.code === curr.code ? currentColors.primary : currentColors.textSecondary,
                        marginRight: 12 
                      }} 
                    />
                    <View>
                      <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                        {curr.symbol} {curr.code}
                      </Text>
                      <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
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
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Household Expense Distribution</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <Text style={[commonStyles.text, { marginBottom: 12, color: currentColors.text }]}>
              How should household expenses be split among people?
            </Text>
            
            <TouchableOpacity
              style={[
                commonStyles.card,
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
              <View style={commonStyles.rowStart}>
                <Icon 
                  name={data.householdSettings.distributionMethod === 'even' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  style={{ 
                    color: data.householdSettings.distributionMethod === 'even' ? currentColors.primary : currentColors.textSecondary,
                    marginRight: 12 
                  }} 
                />
                <View style={commonStyles.flex1}>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>Even Split</Text>
                  <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                    Each person pays an equal share of household expenses
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                commonStyles.card,
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
              <View style={commonStyles.rowStart}>
                <Icon 
                  name={data.householdSettings.distributionMethod === 'income-based' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  style={{ 
                    color: data.householdSettings.distributionMethod === 'income-based' ? currentColors.primary : currentColors.textSecondary,
                    marginRight: 12 
                  }} 
                />
                <View style={commonStyles.flex1}>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>Income-Based Split</Text>
                  <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                    Each person pays proportionally based on their income
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.error }]}>Danger Zone</Text>
          
          <View style={[commonStyles.card, { borderColor: currentColors.error, borderWidth: 1, backgroundColor: currentColors.backgroundAlt }]}>
            <Text style={[commonStyles.text, { marginBottom: 12, color: currentColors.text }]}>
              This will permanently delete all your data including people, income, and expenses.
            </Text>
            
            <Button
              text="Clear All Data"
              onPress={clearAllData}
              style={[buttonStyles.danger, { backgroundColor: currentColors.error }]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
