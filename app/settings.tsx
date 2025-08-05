
import { Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, buttonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import { 
  calculateTotalIncome, 
  calculateTotalExpenses, 
  calculateHouseholdExpenses,
  calculateHouseholdShare,
  calculateMonthlyAmount 
} from '../utils/calculations';
import Button from '../components/Button';
import Icon from '../components/Icon';

export default function SettingsScreen() {
  const { data, updateHouseholdSettings } = useBudgetData();
  const { currentColors, themeMode, setThemeMode } = useTheme();
  const { currency, setCurrency, formatCurrency } = useCurrency();

  const handleDistributionMethodChange = (method: 'even' | 'income-based') => {
    updateHouseholdSettings({ distributionMethod: method });
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
            const emptyData = {
              people: [],
              expenses: [],
              householdSettings: { distributionMethod: 'even' as const },
            };
            await updateHouseholdSettings(emptyData.householdSettings);
            Alert.alert('Success', 'All data has been cleared.');
          }
        },
      ]
    );
  };

  const totalIncome = calculateTotalIncome(data.people);
  const totalExpenses = calculateTotalExpenses(data.expenses);
  const householdExpenses = calculateHouseholdExpenses(data.expenses);

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
                  onPress={() => setCurrency(curr)}
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

        {/* Household Share Breakdown */}
        {data.people.length > 0 && householdExpenses > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Household Share Breakdown</Text>
            
            <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
              <Text style={[commonStyles.text, { marginBottom: 12, fontWeight: '600', color: currentColors.text }]}>
                Monthly household expenses: {formatCurrency(calculateMonthlyAmount(householdExpenses, 'yearly'))}
              </Text>
              
              {data.people.map((person) => {
                const share = calculateHouseholdShare(
                  householdExpenses,
                  data.people,
                  data.householdSettings.distributionMethod,
                  person.id
                );
                const monthlyShare = calculateMonthlyAmount(share, 'yearly');
                
                return (
                  <View key={person.id} style={[commonStyles.row, { marginBottom: 8 }]}>
                    <Text style={[commonStyles.text, { color: currentColors.text }]}>{person.name}</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                      {formatCurrency(monthlyShare)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Budget Summary */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Budget Summary</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Total People:</Text>
              <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                {data.people.length}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Total Expenses:</Text>
              <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                {data.expenses.length}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Annual Income:</Text>
              <Text style={[commonStyles.text, { color: currentColors.income, fontWeight: '600' }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Annual Expenses:</Text>
              <Text style={[commonStyles.text, { color: currentColors.expense, fontWeight: '600' }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
            
            <View style={[
              commonStyles.row, 
              { borderTopWidth: 1, borderTopColor: currentColors.border, paddingTop: 8 }
            ]}>
              <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>Net Annual:</Text>
              <Text style={[
                commonStyles.text, 
                { 
                  color: totalIncome - totalExpenses >= 0 ? currentColors.success : currentColors.error,
                  fontWeight: '700' 
                }
              ]}>
                {formatCurrency(totalIncome - totalExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Quick Actions</Text>
          
          <Button
            text="Manage People & Income"
            onPress={() => router.push('/people')}
            style={[buttonStyles.primary, { backgroundColor: currentColors.secondary }]}
          />
          
          <Button
            text="View All Expenses"
            onPress={() => router.push('/expenses')}
            style={[buttonStyles.primary, { backgroundColor: currentColors.primary }]}
          />
          
          <Button
            text="Add New Expense"
            onPress={() => router.push('/add-expense')}
            style={[buttonStyles.primary, { backgroundColor: currentColors.expense }]}
          />
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
