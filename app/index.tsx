
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { commonStyles, colors } from '../styles/commonStyles';
import { useBudgetData } from '../hooks/useBudgetData';
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

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={commonStyles.text}>Loading...</Text>
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const QuickActionCard = ({ title, icon, onPress, color }: any) => (
    <TouchableOpacity 
      style={[commonStyles.card, { backgroundColor: color, minHeight: 100 }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={commonStyles.centerContent}>
        <Icon name={icon} size={32} style={{ color: colors.backgroundAlt, marginBottom: 8 }} />
        <Text style={[commonStyles.text, { color: colors.backgroundAlt, textAlign: 'center', fontWeight: '600' }]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <Text style={commonStyles.headerTitle}>Budget Tracker</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Icon name="settings-outline" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={commonStyles.content} contentContainerStyle={commonStyles.scrollContent}>
        {/* Budget Overview */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.subtitle}>Monthly Overview</Text>
          
          <View style={commonStyles.card}>
            <View style={[commonStyles.row, { marginBottom: 12 }]}>
              <Text style={commonStyles.text}>Income</Text>
              <Text style={[commonStyles.text, { color: colors.income, fontWeight: '600' }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { marginBottom: 12 }]}>
              <Text style={commonStyles.text}>Expenses</Text>
              <Text style={[commonStyles.text, { color: colors.expense, fontWeight: '600' }]}>
                {formatCurrency(monthlyExpenses)}
              </Text>
            </View>
            
            <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
              <Text style={[commonStyles.text, { fontWeight: '600' }]}>Remaining</Text>
              <Text style={[
                commonStyles.text, 
                { 
                  color: monthlyRemaining >= 0 ? colors.success : colors.error, 
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
          <Text style={commonStyles.subtitle}>Expense Breakdown</Text>
          
          <View style={commonStyles.card}>
            <View style={[commonStyles.row, { marginBottom: 8 }]}>
              <View style={commonStyles.rowStart}>
                <View style={[
                  commonStyles.badge, 
                  { backgroundColor: colors.household, marginRight: 8 }
                ]}>
                  <Text style={commonStyles.badgeText}>Household</Text>
                </View>
                <Text style={commonStyles.text}>Shared Expenses</Text>
              </View>
              <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                {formatCurrency(calculateMonthlyAmount(householdExpenses, 'yearly'))}
              </Text>
            </View>
            
            <View style={commonStyles.row}>
              <View style={commonStyles.rowStart}>
                <View style={[
                  commonStyles.badge, 
                  { backgroundColor: colors.personal, marginRight: 8 }
                ]}>
                  <Text style={commonStyles.badgeText}>Personal</Text>
                </View>
                <Text style={commonStyles.text}>Individual Expenses</Text>
              </View>
              <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                {formatCurrency(calculateMonthlyAmount(personalExpenses, 'yearly'))}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.subtitle}>Quick Actions</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <QuickActionCard
                title="Add Expense"
                icon="add-circle-outline"
                color={colors.expense}
                onPress={() => router.push('/add-expense')}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <QuickActionCard
                title="Manage People"
                icon="people-outline"
                color={colors.secondary}
                onPress={() => router.push('/people')}
              />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <QuickActionCard
                title="View Expenses"
                icon="list-outline"
                color={colors.primary}
                onPress={() => router.push('/expenses')}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <QuickActionCard
                title="Income & Settings"
                icon="settings-outline"
                color={colors.income}
                onPress={() => router.push('/settings')}
              />
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.subtitle}>Recent Expenses</Text>
          
          {data.expenses.length === 0 ? (
            <View style={commonStyles.emptyState}>
              <Icon name="receipt-outline" size={48} style={{ color: colors.textSecondary }} />
              <Text style={commonStyles.emptyStateText}>
                No expenses yet.{'\n'}Tap "Add Expense" to get started!
              </Text>
            </View>
          ) : (
            data.expenses.slice(-3).reverse().map((expense) => {
              const person = data.people.find(p => p.id === expense.personId);
              return (
                <View key={expense.id} style={commonStyles.card}>
                  <View style={commonStyles.row}>
                    <View style={commonStyles.flex1}>
                      <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                        {expense.description}
                      </Text>
                      <Text style={commonStyles.textSecondary}>
                        {expense.category === 'household' ? 'Household' : person?.name || 'Personal'}
                        {' • '}
                        {expense.frequency}
                      </Text>
                    </View>
                    <Text style={[
                      commonStyles.text, 
                      { 
                        color: colors.expense, 
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
      </ScrollView>
    </View>
  );
}
