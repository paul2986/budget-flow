
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
  viewMode?: 'daily' | 'monthly' | 'yearly';
}

export default function IndividualBreakdownsSection({ 
  people, 
  expenses, 
  householdSettings, 
  totalHouseholdExpenses,
  viewMode = 'monthly'
}: IndividualBreakdownsSectionProps) {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();

  // Helper function to convert amounts based on view mode
  const convertAmount = (amount: number): number => {
    if (viewMode === 'daily') {
      return calculateMonthlyAmount(amount, 'yearly') / 30.44; // Average days per month
    } else if (viewMode === 'monthly') {
      return calculateMonthlyAmount(amount, 'yearly');
    }
    return amount; // yearly
  };

  if (!people || people.length === 0) {
    return (
      <View style={[
        themedStyles.card, 
        { 
          marginBottom: 0,
        }
      ]}>
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
    <View style={{ gap: 16 }}>
      {people.map((person) => {
        const personIncome = calculatePersonIncome(person);
        const personPersonalExpenses = calculatePersonalExpenses(expenses, person.id);
        const personHouseholdShare = calculateHouseholdShare(
          totalHouseholdExpenses,
          people,
          householdSettings?.distributionMethod || 'even',
          person.id
        );
        const personRemaining = personIncome - personPersonalExpenses - personHouseholdShare;
        
        // Convert amounts based on view mode
        const displayPersonIncome = convertAmount(personIncome);
        const displayPersonPersonalExpenses = convertAmount(personPersonalExpenses);
        const displayPersonHouseholdShare = convertAmount(personHouseholdShare);
        const displayPersonRemaining = convertAmount(personRemaining);

        // Calculate percentages for the progress bar
        const personalPercentage = displayPersonIncome > 0 ? (displayPersonPersonalExpenses / displayPersonIncome) * 100 : 0;
        const householdPercentage = displayPersonIncome > 0 ? (displayPersonHouseholdShare / displayPersonIncome) * 100 : 0;
        const remainingPercentage = displayPersonIncome > 0 ? Math.max(0, (displayPersonRemaining / displayPersonIncome) * 100) : 0;

        // Ensure percentages don't exceed 100% for display
        const displayPersonalPercentage = Math.min(personalPercentage, 100);
        const displayHouseholdPercentage = Math.min(householdPercentage, 100 - displayPersonalPercentage);
        const displayRemainingPercentage = Math.max(0, 100 - displayPersonalPercentage - displayHouseholdPercentage);

        return (
          <View 
            key={person.id} 
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.backgroundAlt,
                borderColor: currentColors.border,
                borderWidth: 1,
                marginBottom: 0,
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
                  {viewMode === 'yearly' ? 'Yearly' : viewMode === 'daily' ? 'Daily' : 'Monthly'} breakdown
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[
                  themedStyles.text, 
                  { 
                    fontSize: 16, 
                    fontWeight: '700',
                    color: displayPersonRemaining >= 0 ? currentColors.success : currentColors.error
                  }
                ]}>
                  {formatCurrency(displayPersonRemaining)}
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
                {formatCurrency(displayPersonIncome)}
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
                {formatCurrency(displayPersonPersonalExpenses)}
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
                {formatCurrency(displayPersonHouseholdShare)}
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
                {displayPersonIncome > 0 && (
                  <>
                    {/* Personal Expenses Bar */}
                    {displayPersonalPercentage > 0 && (
                      <View style={{
                        backgroundColor: currentColors.personal,
                        width: `${displayPersonalPercentage}%`,
                      }} />
                    )}
                    {/* Household Share Bar */}
                    {displayHouseholdPercentage > 0 && (
                      <View style={{
                        backgroundColor: currentColors.household,
                        width: `${displayHouseholdPercentage}%`,
                      }} />
                    )}
                    {/* Remaining Income Bar - Green */}
                    {displayRemainingPercentage > 0 && displayPersonRemaining >= 0 && (
                      <View style={{
                        backgroundColor: currentColors.success,
                        width: `${displayRemainingPercentage}%`,
                      }} />
                    )}
                    {/* Over Budget Bar - Red */}
                    {displayPersonRemaining < 0 && (
                      <View style={{
                        backgroundColor: currentColors.error,
                        width: `${Math.min(Math.abs((displayPersonRemaining / displayPersonIncome) * 100), 100 - displayPersonalPercentage - displayHouseholdPercentage)}%`,
                      }} />
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Percentage Labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>
                {displayPersonIncome > 0 
                  ? `${personalPercentage.toFixed(0)}% personal`
                  : '0% personal'
                }
              </Text>
              <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>
                {displayPersonIncome > 0 
                  ? `${householdPercentage.toFixed(0)}% household`
                  : '0% household'
                }
              </Text>
              {displayPersonRemaining >= 0 ? (
                <Text style={[themedStyles.textSecondary, { fontSize: 11, color: currentColors.success }]}>
                  {displayPersonIncome > 0 
                    ? `${remainingPercentage.toFixed(0)}% remaining`
                    : '0% remaining'
                  }
                </Text>
              ) : (
                <Text style={[themedStyles.textSecondary, { fontSize: 11, color: currentColors.error }]}>
                  {displayPersonIncome > 0 
                    ? `${Math.abs((displayPersonRemaining / displayPersonIncome) * 100).toFixed(0)}% over budget`
                    : 'Over budget'
                  }
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
