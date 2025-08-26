
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { calculateMonthlyAmount } from '../utils/calculations';
import Icon from './Icon';
import { Expense, DEFAULT_CATEGORIES } from '../types/budget';

interface ExpenseBreakdownSectionProps {
  expenses: Expense[];
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface TypeBreakdown {
  type: 'household' | 'personal';
  amount: number;
  count: number;
  percentage: number;
  categories: CategoryBreakdown[];
}

const { width: screenWidth } = Dimensions.get('window');

export default function ExpenseBreakdownSection({ expenses }: ExpenseBreakdownSectionProps) {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();
  
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<View>(null);
  
  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const scaleAnim = useSharedValue(0.8);
  const chartAnimations = useSharedValue(0);

  // Calculate breakdown data
  const breakdownData = React.useMemo(() => {
    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return { household: null, personal: null, totalAmount: 0 };
    }

    const activeExpenses = expenses.filter(expense => {
      if (!expense) return false;
      // For simplicity, include all expenses (you can add date filtering here if needed)
      return true;
    });

    const totalAmount = activeExpenses.reduce((sum, expense) => {
      return sum + calculateMonthlyAmount(expense.amount, expense.frequency);
    }, 0);

    if (totalAmount === 0) {
      return { household: null, personal: null, totalAmount: 0 };
    }

    const groupByType = (type: 'household' | 'personal'): TypeBreakdown | null => {
      const typeExpenses = activeExpenses.filter(expense => expense.category === type);
      
      if (typeExpenses.length === 0) return null;

      const typeAmount = typeExpenses.reduce((sum, expense) => {
        return sum + calculateMonthlyAmount(expense.amount, expense.frequency);
      }, 0);

      // Group by category tag
      const categoryMap = new Map<string, { amount: number; count: number }>();
      
      typeExpenses.forEach(expense => {
        const category = expense.categoryTag || 'Misc';
        const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
        
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          categoryMap.set(category, {
            amount: existing.amount + monthlyAmount,
            count: existing.count + 1,
          });
        } else {
          categoryMap.set(category, {
            amount: monthlyAmount,
            count: 1,
          });
        }
      });

      const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          percentage: typeAmount > 0 ? (data.amount / typeAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        type,
        amount: typeAmount,
        count: typeExpenses.length,
        percentage: totalAmount > 0 ? (typeAmount / totalAmount) * 100 : 0,
        categories,
      };
    };

    return {
      household: groupByType('household'),
      personal: groupByType('personal'),
      totalAmount,
    };
  }, [expenses]);

  // Trigger animations when component becomes visible
  useEffect(() => {
    if (isVisible) {
      // Main container animations
      fadeAnim.value = withTiming(1, { duration: 800 });
      slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });
      scaleAnim.value = withSpring(1, { damping: 12, stiffness: 80 });
      
      // Delayed chart animations
      chartAnimations.value = withDelay(400, withTiming(1, { duration: 1200 }));
    }
  }, [isVisible, chartAnimations, fadeAnim, scaleAnim, slideAnim]);

  // Trigger visibility when scrolled into view
  const handleLayout = () => {
    if (containerRef.current) {
      containerRef.current.measure((x, y, width, height, pageX, pageY) => {
        // Trigger animation when the component is 70% visible
        const triggerPoint = pageY + height * 0.3;
        const screenHeight = Dimensions.get('window').height;
        
        if (triggerPoint <= screenHeight && !isVisible) {
          setIsVisible(true);
        }
      });
    }
  };

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [
        { translateY: slideAnim.value },
        { scale: scaleAnim.value },
      ],
    };
  });

  const chartAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: chartAnimations.value,
      transform: [
        { scale: interpolate(chartAnimations.value, [0, 1], [0.5, 1], Extrapolate.CLAMP) },
      ],
    };
  });

  if (!breakdownData.household && !breakdownData.personal) {
    return (
      <View style={[themedStyles.card, { marginBottom: 0 }]}>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Icon name="pie-chart-outline" size={48} style={{ color: currentColors.textSecondary, marginBottom: 12 }} />
          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            No expenses to analyze yet. Add some expenses to see the breakdown.
          </Text>
        </View>
      </View>
    );
  }

  // Create animated components for type breakdown
  const TypeBreakdownComponent = ({ breakdown, index }: { breakdown: TypeBreakdown; index: number }) => {
    const isHousehold = breakdown.type === 'household';
    const typeColor = isHousehold ? currentColors.household : currentColors.personal;
    const typeIcon = isHousehold ? 'home' : 'person';
    
    const animatedStyle = useAnimatedStyle(() => {
      const delay = index * 200;
      const progress = interpolate(
        chartAnimations.value,
        [0, 1],
        [0, 1],
        Extrapolate.CLAMP
      );
      
      return {
        opacity: withDelay(delay, withTiming(progress, { duration: 600 })),
        transform: [
          { 
            translateX: withDelay(
              delay, 
              withSpring(interpolate(progress, [0, 1], [50, 0]), { damping: 15 })
            )
          },
        ],
      };
    });

    return (
      <Animated.View
        key={breakdown.type}
        style={[
          themedStyles.card,
          {
            backgroundColor: typeColor + '10',
            borderColor: typeColor + '30',
            borderWidth: 2,
            marginBottom: 16,
          },
          animatedStyle,
        ]}
      >
        {/* Type Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: typeColor + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}>
            <Icon name={typeIcon} size={24} style={{ color: typeColor }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[themedStyles.subtitle, { fontSize: 20, fontWeight: '700', marginBottom: 4 }]}>
              {isHousehold ? 'Household Expenses' : 'Personal Expenses'}
            </Text>
            <Text style={[themedStyles.textSecondary, { fontSize: 14 }]}>
              {breakdown.count} {breakdown.count === 1 ? 'expense' : 'expenses'} • {breakdown.percentage.toFixed(1)}% of total
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[
              themedStyles.text,
              { fontSize: 18, fontWeight: '700', color: typeColor }
            ]}>
              {formatCurrency(breakdown.amount)}
            </Text>
            <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
              per month
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View style={{ gap: 12 }}>
          {breakdown.categories.map((category, categoryIndex) => {
            const CategoryComponent = () => {
              const categoryAnimatedStyle = useAnimatedStyle(() => {
                const categoryDelay = (index * 200) + (categoryIndex * 100) + 300;
                const progress = interpolate(
                  chartAnimations.value,
                  [0, 1],
                  [0, 1],
                  Extrapolate.CLAMP
                );
                
                return {
                  opacity: withDelay(categoryDelay, withTiming(progress, { duration: 400 })),
                  transform: [
                    { 
                      scale: withDelay(
                        categoryDelay, 
                        withSpring(interpolate(progress, [0, 1], [0.8, 1]), { damping: 12 })
                      )
                    },
                  ],
                };
              });

              const barAnimatedStyle = useAnimatedStyle(() => {
                const barDelay = (index * 200) + (categoryIndex * 100) + 500;
                const progress = interpolate(
                  chartAnimations.value,
                  [0, 1],
                  [0, category.percentage],
                  Extrapolate.CLAMP
                );
                
                return {
                  width: withDelay(barDelay, withTiming(`${progress}%`, { duration: 800 })),
                };
              });

              return (
                <Animated.View
                  style={[
                    {
                      backgroundColor: currentColors.backgroundAlt,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: currentColors.border,
                    },
                    categoryAnimatedStyle,
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[themedStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                      {category.category}
                    </Text>
                    <Text style={[themedStyles.text, { fontSize: 14, fontWeight: '700', color: typeColor }]}>
                      {formatCurrency(category.amount)}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                      {category.count} {category.count === 1 ? 'expense' : 'expenses'}
                    </Text>
                    <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                      {category.percentage.toFixed(1)}% of {breakdown.type}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={{
                    height: 6,
                    backgroundColor: currentColors.border,
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <Animated.View
                      style={[
                        {
                          height: '100%',
                          backgroundColor: typeColor,
                          borderRadius: 3,
                        },
                        barAnimatedStyle,
                      ]}
                    />
                  </View>
                </Animated.View>
              );
            };

            return <CategoryComponent key={category.category} />;
          })}
        </View>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      ref={containerRef}
      onLayout={handleLayout}
      style={[containerAnimatedStyle]}
    >
      {/* Summary Card */}
      <Animated.View
        style={[
          themedStyles.card,
          {
            backgroundColor: currentColors.primary + '10',
            borderColor: currentColors.primary + '30',
            borderWidth: 2,
            marginBottom: 24,
          },
          chartAnimatedStyle,
        ]}
      >
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: currentColors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Icon name="pie-chart" size={32} style={{ color: currentColors.primary }} />
          </View>
          <Text style={[themedStyles.subtitle, { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 }]}>
            Expense Analysis
          </Text>
          <Text style={[themedStyles.textSecondary, { textAlign: 'center', fontSize: 16 }]}>
            Monthly breakdown by type and category
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: currentColors.backgroundAlt,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: currentColors.border,
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[themedStyles.text, { fontSize: 24, fontWeight: '800', color: currentColors.primary }]}>
              {formatCurrency(breakdownData.totalAmount)}
            </Text>
            <Text style={[themedStyles.textSecondary, { fontSize: 14, marginTop: 4 }]}>
              Total Monthly Expenses
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Type Breakdowns */}
      <View>
        {breakdownData.household && <TypeBreakdownComponent breakdown={breakdownData.household} index={0} />}
        {breakdownData.personal && <TypeBreakdownComponent breakdown={breakdownData.personal} index={1} />}
      </View>
    </Animated.View>
  );
}
