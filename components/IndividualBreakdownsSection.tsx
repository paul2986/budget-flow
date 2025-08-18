
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { 
  calculatePersonIncome, 
  calculatePersonalExpenses, 
  calculateHouseholdShare, 
  calculateMonthlyAmount 
} from '../utils/calculations';
import Icon from './Icon';
import { Person, Expense, HouseholdSettings } from '../types/budget';

interface IndividualBreakdownsSectionProps {
  people: Person[];
  expenses: Expense[];
  householdSettings?: HouseholdSettings;
  totalHouseholdExpenses: number;
}

export default function IndividualBreakdownsSection({ 
  people, 
  expenses, 
  householdSettings, 
  totalHouseholdExpenses 
}: IndividualBreakdownsSectionProps) {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();

  if (!people || people.length === 0) {
    return (
      <View style={[themedStyles.card, { marginBottom: 0 }]}>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Icon name="person-add-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            No people added yet. Add people to see individual breakdowns.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[themedStyles.card, { marginBottom: 0 }]}>
      {people.map((person, index) => {
        const personIncome = calculatePersonIncome(person);
        const personPersonalExpenses = calculatePersonalExpenses(expenses, person.id);
        const personHouseholdShare = calculateHouseholdShare(
          totalHouseholdExpenses,
          people,
          householdSettings?.distributionMethod || 'even',
          person.id
        );
        const personRemaining = personIncome - personPersonalExpenses - personHouseholdShare;
        
        const monthlyPersonIncome = calculateMonthlyAmount(personIncome, 'yearly');
        const monthlyPersonPersonalExpenses = calculateMonthlyAmount(personPersonalExpenses, 'yearly');
        const monthlyPersonHouseholdShare = calculateMonthlyAmount(personHouseholdShare, 'yearly');
        const monthlyPersonRemaining = calculateMonthlyAmount(personRemaining, 'yearly');

        return (
          <View 
            key={person.id} 
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                borderWidth: 1,
                marginBottom: index === people.length - 1 ? 0 : 16,
              }
            ]}
          >
            {/* Person Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: currentColors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Icon name="person" size={20} style={{ color: currentColors.primary }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[themedStyles.text, { fontSize: 16, fontWeight: '700' }]}>
                  {person.name}
                </Text>
                <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                  Monthly breakdown
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[
                  themedStyles.text, 
                  { 
                    fontSize: 16, 
                    fontWeight: '700',
                    color: monthlyPersonRemaining >= 0 ? currentColors.success : currentColors.error
                  }
                ]}>
                  {formatCurrency(monthlyPersonRemaining)}
                </Text>
                <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>
                  remaining
                </Text>
              </View>
            </View>

            {/* Income */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="trending-up" size={14} style={{ color: currentColors.success, marginRight: 6 }} />
                <Text style={[themedStyles.textSecondary, { fontSize: 14 }]}>Income</Text>
              </View>
              <Text style={[
                themedStyles.text, 
                { 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: currentColors.success 
                }
              ]}>
                {formatCurrency(monthlyPersonIncome)}
              </Text>
            </View>

            {/* Personal Expenses */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="person" size={14} style={{ color: currentColors.personal, marginRight: 6 }} />
                <Text style={[themedStyles.textSecondary, { fontSize: 14 }]}>Personal Expenses</Text>
              </View>
              <Text style={[
                themedStyles.text, 
                { 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: currentColors.personal 
                }
              ]}>
                {formatCurrency(monthlyPersonPersonalExpenses)}
              </Text>
            </View>

            {/* Household Share */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="home" size={14} style={{ color: currentColors.household, marginRight: 6 }} />
                <Text style={[themedStyles.textSecondary, { fontSize: 14 }]}>Household Share</Text>
              </View>
              <Text style={[
                themedStyles.text, 
                { 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: currentColors.household 
                }
              ]}>
                {formatCurrency(monthlyPersonHouseholdShare)}
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={{ marginBottom: 8 }}>
              <View style={{
                height: 8,
                backgroundColor: currentColors.border,
                borderRadius: 4,
                overflow: 'hidden',
                flexDirection: 'row',
              }}>
                {monthlyPersonIncome > 0 && (
                  <>
                    {/* Personal Expenses Bar */}
                    {monthlyPersonPersonalExpenses > 0 && (
                      <View style={{
                        backgroundColor: currentColors.personal,
                        width: `${Math.min((monthlyPersonPersonalExpenses / monthlyPersonIncome) * 100, 100)}%`,
                      }} />
                    )}
                    {/* Household Share Bar */}
                    {monthlyPersonHouseholdShare > 0 && (
                      <View style={{
                        backgroundColor: currentColors.household,
                        width: `${Math.min((monthlyPersonHouseholdShare / monthlyPersonIncome) * 100, 100 - (monthlyPersonPersonalExpenses / monthlyPersonIncome) * 100)}%`,
                      }} />
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Percentage Labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>
                {monthlyPersonIncome > 0 
                  ? `${((monthlyPersonPersonalExpenses / monthlyPersonIncome) * 100).toFixed(0)}% personal`
                  : '0% personal'
                }
              </Text>
              <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>
                {monthlyPersonIncome > 0 
                  ? `${((monthlyPersonHouseholdShare / monthlyPersonIncome) * 100).toFixed(0)}% household`
                  : '0% household'
                }
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
