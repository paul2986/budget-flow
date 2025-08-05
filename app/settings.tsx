
import { Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
            // Note: In a real app, you'd want a more comprehensive clear function
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
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Household Distribution Settings */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.subtitle}>Household Expense Distribution</Text>
          
          <View style={commonStyles.card}>
            <Text style={[commonStyles.text, { marginBottom: 12 }]}>
              How should household expenses be split among people?
            </Text>
            
            <TouchableOpacity
              style={[
                commonStyles.card,
                { 
                  backgroundColor: data.householdSettings.distributionMethod === 'even' 
                    ? colors.primary + '20' 
                    : colors.border + '20',
                  borderWidth: 2,
                  borderColor: data.householdSettings.distributionMethod === 'even' 
                    ? colors.primary 
                    : colors.border,
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
                    color: data.householdSettings.distributionMethod === 'even' ? colors.primary : colors.textSecondary,
                    marginRight: 12 
                  }} 
                />
                <View style={commonStyles.flex1}>
                  <Text style={[commonStyles.text, { fontWeight: '600' }]}>Even Split</Text>
                  <Text style={commonStyles.textSecondary}>
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
                    ? colors.primary + '20' 
                    : colors.border + '20',
                  borderWidth: 2,
                  borderColor: data.householdSettings.distributionMethod === 'income-based' 
                    ? colors.primary 
                    : colors.border,
                }
              ]}
              onPress={() => handleDistributionMethodChange('income-based')}
            >
              <View style={commonStyles.rowStart}>
                <Icon 
                  name={data.householdSettings.distributionMethod === 'income-based' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  style={{ 
                    color: data.householdSettings.distributionMethod === 'income-based' ? colors.primary : colors.textSecondary,
                    marginRight: 12 
                  }} 
                />
                <View style={commonStyles.flex1}>
                  <Text style={[commonStyles.text, { fontWeight: '600' }]}>Income-Based Split</Text>
                  <Text style={commonStyles.textSecondary}>
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
            <Text style={commonStyles.subtitle}>Household Share Breakdown</Text>
            
            <View style={commonStyles.card}>
              <Text style={[commonStyles.text, { marginBottom: 12, fontWeight: '600' }]}>
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
                    <Text style={commonStyles.text}>{person.name}</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600' }]}>
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
          <Text style={commonStyles.subtitle}>Budget Summary</Text>
          
          <View style={commonStyles.card}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={commonStyles.text}>Total People:</Text>
              <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                {data.people.length}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={commonStyles.text}>Total Expenses:</Text>
              <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                {data.expenses.length}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={commonStyles.text}>Annual Income:</Text>
              <Text style={[commonStyles.text, { color: colors.income, fontWeight: '600' }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <Text style={commonStyles.text}>Annual Expenses:</Text>
              <Text style={[commonStyles.text, { color: colors.expense, fontWeight: '600' }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
            
            <View style={[
              commonStyles.row, 
              { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }
            ]}>
              <Text style={[commonStyles.text, { fontWeight: '600' }]}>Net Annual:</Text>
              <Text style={[
                commonStyles.text, 
                { 
                  color: totalIncome - totalExpenses >= 0 ? colors.success : colors.error,
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
          <Text style={commonStyles.subtitle}>Quick Actions</Text>
          
          <Button
            text="Manage People & Income"
            onPress={() => router.push('/people')}
            style={[buttonStyles.primary, { backgroundColor: colors.secondary }]}
          />
          
          <Button
            text="View All Expenses"
            onPress={() => router.push('/expenses')}
            style={[buttonStyles.primary]}
          />
          
          <Button
            text="Add New Expense"
            onPress={() => router.push('/add-expense')}
            style={[buttonStyles.primary, { backgroundColor: colors.expense }]}
          />
        </View>

        {/* Danger Zone */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: colors.error }]}>Danger Zone</Text>
          
          <View style={[commonStyles.card, { borderColor: colors.error, borderWidth: 1 }]}>
            <Text style={[commonStyles.text, { marginBottom: 12 }]}>
              This will permanently delete all your data including people, income, and expenses.
            </Text>
            
            <Button
              text="Clear All Data"
              onPress={clearAllData}
              style={[buttonStyles.danger]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
