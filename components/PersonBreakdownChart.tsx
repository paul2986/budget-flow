
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';

interface PersonBreakdownChartProps {
  income: number;
  personalExpenses: number;
  householdShare: number;
  remaining: number;
}

export default function PersonBreakdownChart({ 
  income, 
  personalExpenses, 
  householdShare, 
  remaining 
}: PersonBreakdownChartProps) {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();

  // Handle edge case where income is 0
  if (income <= 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.chartContainer, { backgroundColor: currentColors.border }]}>
          <View style={[styles.chartSegment, { backgroundColor: currentColors.error, width: '100%' }]} />
        </View>
        <View style={styles.labelsContainer}>
          <Text style={[styles.percentageLabel, { color: currentColors.error }]}>
            No Income
          </Text>
        </View>
        <View style={[styles.overBudgetIndicator, { backgroundColor: currentColors.error + '20', borderColor: currentColors.error }]}>
          <Text style={[styles.overBudgetText, { color: currentColors.error }]}>
            ⚠️ No income sources defined
          </Text>
        </View>
      </View>
    );
  }

  // Calculate percentages for the visual representation
  const totalExpenses = personalExpenses + householdShare;
  const personalPercentage = (personalExpenses / income) * 100;
  const householdPercentage = (householdShare / income) * 100;
  const remainingPercentage = Math.max(0, (remaining / income) * 100);
  const overBudgetPercentage = remaining < 0 ? Math.abs((remaining / income) * 100) : 0;

  // Ensure percentages don't exceed 100% for display purposes
  const displayPersonalPercentage = Math.min(personalPercentage, 100);
  const displayHouseholdPercentage = Math.min(householdPercentage, 100 - displayPersonalPercentage);
  const displayRemainingPercentage = Math.max(0, 100 - displayPersonalPercentage - displayHouseholdPercentage);

  console.log('PersonBreakdownChart:', {
    income,
    personalExpenses,
    householdShare,
    remaining,
    personalPercentage,
    householdPercentage,
    remainingPercentage,
    overBudgetPercentage
  });

  return (
    <View style={styles.container}>
      {/* Horizontal Bar Chart */}
      <View 
        style={[styles.chartContainer, { backgroundColor: currentColors.border }]}
        accessibilityLabel={`Budget breakdown: ${personalPercentage.toFixed(0)}% personal expenses, ${householdPercentage.toFixed(0)}% household share, ${Math.abs(remainingPercentage).toFixed(0)}% ${remaining >= 0 ? 'remaining' : 'over budget'}`}
        accessibilityRole="progressbar"
      >
        {/* Personal Expenses Bar */}
        {displayPersonalPercentage > 0 && (
          <View 
            style={[
              styles.chartSegment,
              {
                backgroundColor: currentColors.personal,
                width: `${displayPersonalPercentage}%`,
              }
            ]}
            accessibilityLabel={`Personal expenses: ${personalPercentage.toFixed(0)}%`}
          />
        )}
        
        {/* Household Share Bar */}
        {displayHouseholdPercentage > 0 && (
          <View 
            style={[
              styles.chartSegment,
              {
                backgroundColor: currentColors.household,
                width: `${displayHouseholdPercentage}%`,
              }
            ]}
            accessibilityLabel={`Household share: ${householdPercentage.toFixed(0)}%`}
          />
        )}
        
        {/* Remaining Income Bar */}
        {displayRemainingPercentage > 0 && (
          <View 
            style={[
              styles.chartSegment,
              {
                backgroundColor: remaining >= 0 ? currentColors.success : currentColors.error,
                width: `${displayRemainingPercentage}%`,
              }
            ]}
            accessibilityLabel={`${remaining >= 0 ? 'Remaining income' : 'Over budget'}: ${Math.abs(remainingPercentage).toFixed(0)}%`}
          />
        )}
      </View>

      {/* Percentage Labels */}
      <View style={styles.labelsContainer}>
        {personalPercentage > 3 && (
          <Text style={[styles.percentageLabel, { color: currentColors.personal }]}>
            Personal {personalPercentage.toFixed(0)}%
          </Text>
        )}
        {householdPercentage > 3 && (
          <Text style={[styles.percentageLabel, { color: currentColors.household }]}>
            Household {householdPercentage.toFixed(0)}%
          </Text>
        )}
        {remainingPercentage > 3 && (
          <Text style={[styles.percentageLabel, { color: remaining >= 0 ? currentColors.success : currentColors.error }]}>
            {remaining >= 0 ? 'Remaining' : 'Over'} {Math.abs(remainingPercentage).toFixed(0)}%
          </Text>
        )}
      </View>

      {/* Over Budget Indicator */}
      {remaining < 0 && (
        <View style={[styles.overBudgetIndicator, { backgroundColor: currentColors.error + '20', borderColor: currentColors.error }]}>
          <Text style={[styles.overBudgetText, { color: currentColors.error }]}>
            ⚠️ Over budget by {formatCurrency(Math.abs(remaining))}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chartContainer: {
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  chartSegment: {
    height: '100%',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  percentageLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  overBudgetIndicator: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  overBudgetText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
