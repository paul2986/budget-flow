
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { commonStyles } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { 
  calculateTotalIncome, 
  calculateTotalExpenses, 
  calculateHouseholdExpenses,
  calculatePersonalExpenses,
  calculateMonthlyAmount 
} from '../utils/calculations';
import Icon from '../components/Icon';

export default function HomeScreen() {
  const { data, loading } = useBudgetData();
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent, { backgroundColor: currentColors.background }]}>
        <Text style={[commonStyles.text, { color: currentColors.text }]}>Loading...</Text>
      </View>
    );
  }

  const totalIncome = calculateTotalIncome(data.people);
  const totalExpenses = calculateTotalExpenses(data.expenses);
  const householdExpenses = calculateHouseholdExpenses(data.expenses);
  const personalExpenses = calculatePersonalExpenses(data.expenses);
  const remainingBudget = totalIncome - totalExpenses;

  const monthlyIncome = calculateMonthlyAmount(totalIncome, 'yearly');
  const monthlyExpenses = calculateMonthlyAmount(totalExpenses, 'yearly');
  const monthlyRemaining = calculateMonthlyAmount(remainingBudget, 'yearly');

  return (
    <View style={[commonStyles.container, { backgroundColor: currentColors.background }]}>
      <View style={[commonStyles.header, { backgroundColor: currentColors.backgroundAlt, borderBottomColor: currentColors.border }]}>
        <Text style={[commonStyles.headerTitle, { color: currentColors.text }]}>Budget Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Budget Overview */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Monthly Overview</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <View style={[commonStyles.row, { marginBottom: 12 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Income</Text>
              <Text style={[commonStyles.text, { color: currentColors.income, fontWeight: '600' }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 12 }]}>
              <Text style={[commonStyles.text, { color: currentColors.text }]}>Expenses</Text>
              <Text style={[commonStyles.text, { color: currentColors.expense, fontWeight: '600' }]}>
                {formatCurrency(monthlyExpenses)}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: currentColors.border, paddingTop: 12 }]}>
              <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>Remaining</Text>
              <Text style={[
                commonStyles.text, 
                { 
                  color: monthlyRemaining >= 0 ? currentColors.success : currentColors.error, 
                  fontWeight: '700',
                  fontSize: 18 
                }
              ]}>
                {formatCurrency(monthlyRemaining)}
              </Text>
            </View>
          </View>
        </View>

        {/* Expense Breakdown */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Expense Breakdown</Text>
          
          <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <View style={commonStyles.rowStart}>
                <View style={[
                  commonStyles.badge, 
                  { backgroundColor: currentColors.household, marginRight: 8 }
                ]}>
                  <Text style={[commonStyles.badgeText, { color: currentColors.backgroundAlt }]}>Household</Text>
                </View>
                <Text style={[commonStyles.text, { color: currentColors.text }]}>Shared Expenses</Text>
              </View>
              <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                {formatCurrency(calculateMonthlyAmount(householdExpenses, 'yearly'))}
              </Text>
            </View>
            
            <View style={commonStyles.row}>
              <View style={commonStyles.rowStart}>
                <View style={[
                  commonStyles.badge, 
                  { backgroundColor: currentColors.personal, marginRight: 8 }
                ]}>
                  <Text style={[commonStyles.badgeText, { color: currentColors.backgroundAlt }]}>Personal</Text>
                </View>
                <Text style={[commonStyles.text, { color: currentColors.text }]}>Individual Expenses</Text>
              </View>
              <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                {formatCurrency(calculateMonthlyAmount(personalExpenses, 'yearly'))}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Recent Expenses</Text>
          
          {data.expenses.length === 0 ? (
            <View style={commonStyles.emptyState}>
              <Icon name="receipt-outline" size={48} style={{ color: currentColors.textSecondary }} />
              <Text style={[commonStyles.emptyStateText, { color: currentColors.textSecondary }]}>
                No expenses yet.{'\n'}Use the navigation below to get started!
              </Text>
            </View>
          ) : (
            data.expenses.slice(-3).reverse().map((expense) => {
              const person = data.people.find(p => p.id === expense.personId);
              return (
                <View key={expense.id} style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
                  <View style={commonStyles.row}>
                    <View style={commonStyles.flex1}>
                      <Text style={[commonStyles.text, { fontWeight: '600', color: currentColors.text }]}>
                        {expense.description}
                      </Text>
                      <Text style={[commonStyles.textSecondary, { color: currentColors.textSecondary }]}>
                        {expense.category === 'household' ? 'Household' : person?.name || 'Personal'}
                        {' • '}
                        {expense.frequency}
                      </Text>
                    </View>
                    <Text style={[
                      commonStyles.text, 
                      { 
                        color: currentColors.expense, 
                        fontWeight: '600',
                        fontSize: 16 
                      }
                    ]}>
                      {formatCurrency(expense.amount)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Getting Started */}
        {data.people.length === 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { color: currentColors.text }]}>Getting Started</Text>
            
            <View style={[commonStyles.card, { backgroundColor: currentColors.backgroundAlt, borderColor: currentColors.border }]}>
              <View style={commonStyles.centerContent}>
                <Icon name="information-circle-outline" size={48} style={{ color: currentColors.primary, marginBottom: 12 }} />
                <Text style={[commonStyles.text, { textAlign: 'center', color: currentColors.text, marginBottom: 8 }]}>
                  Welcome to Budget Tracker!
                </Text>
                <Text style={[commonStyles.textSecondary, { textAlign: 'center', color: currentColors.textSecondary }]}>
                  Start by adding people and their income sources, then track your expenses.
                  Use the navigation bar below to get started.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
