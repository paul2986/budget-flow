
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useBudgetData } from '../hooks/useBudgetData';
import { useToast } from '../hooks/useToast';
import { calculateMonthlyAmount, getEndingSoon } from '../utils/calculations';
import Icon from './Icon';
import { Expense } from '../types/budget';

interface ExpiringSectionProps {
  expenses: Expense[];
}

type TabKey = 'ending' | 'ended';

export default function ExpiringSection({ expenses }: ExpiringSectionProps) {
  const { currentColors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { themedStyles } = useThemedStyles();
  const { data, updateExpense, removeExpense } = useBudgetData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('ending');
  const [extendTarget, setExtendTarget] = useState<{ id: string; current?: string } | null>(null);

  const toYMD = useCallback((d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const recurringWithEnd = useMemo(() => {
    if (!expenses || !Array.isArray(expenses)) {
      return [];
    }
    return expenses.filter((e) => e && e.frequency !== 'one-time' && (e as any).endDate);
  }, [expenses]);

  const { endingSoonList, endedList } = useMemo(() => {
    if (!recurringWithEnd || !Array.isArray(recurringWithEnd) || recurringWithEnd.length === 0) {
      return { endingSoonList: [], endedList: [] };
    }

    const ending = getEndingSoon(recurringWithEnd, 30).filter((e) => {
      const end = (e as any).endDate as string;
      const ymd = end ? end.slice(0, 10) : '';
      const today = new Date();
      const todayY = toYMD(today);
      return ymd >= todayY;
    });
    
    const ended = getEndingSoon(recurringWithEnd, 36500).filter((e) => {
      const end = (e as any).endDate as string;
      const ymd = end ? end.slice(0, 10) : '';
      const today = new Date();
      const todayY = toYMD(today);
      return !!ymd && ymd < todayY;
    });
    
    return { endingSoonList: ending, endedList: ended };
  }, [recurringWithEnd, toYMD]);

  const handleExtend = useCallback((expense: Expense) => {
    const currentEnd = (expense as any).endDate ? String((expense as any).endDate).slice(0, 10) : undefined;
    setExtendTarget({ id: expense.id, current: currentEnd });
  }, []);

  const handleDelete = useCallback((expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await removeExpense(expense.id);
            if (res.success) {
              showToast('Deleted expense', 'success');
            } else {
              showToast(res.error?.message || 'Failed to delete expense', 'error');
            }
          },
        },
      ]
    );
  }, [removeExpense, showToast]);

  const onDatePicked = useCallback(
    async (event: any, date?: Date) => {
      const target = extendTarget;
      setExtendTarget(null);
      if (!target || !date) return;

      const picked = toYMD(date);
      const today = toYMD(new Date());
      if (picked < today) {
        showToast('End date must be today or later', 'error');
        return;
      }

      if (!data || !data.expenses || !Array.isArray(data.expenses)) {
        showToast('Data not available', 'error');
        return;
      }

      const expense = data.expenses.find((e) => e && e.id === target.id);
      if (!expense) {
        showToast('Expense not found', 'error');
        return;
      }

      const updated: Expense = { ...expense, endDate: picked } as Expense;
      const res = await updateExpense(updated);
      if (res.success) {
        showToast(`Extended to ${picked}`, 'success');
      } else {
        showToast(res.error?.message || 'Failed to extend', 'error');
      }
    },
    [extendTarget, data, toYMD, updateExpense, showToast]
  );

  const TabButton = ({ tab, label, count }: { tab: TabKey; label: string; count: number }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      style={[
        {
          flex: 1,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 16,
          backgroundColor: activeTab === tab ? currentColors.primary : 'transparent',
          borderWidth: 1,
          borderColor: activeTab === tab ? currentColors.primary : currentColors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text
        style={[
          themedStyles.text,
          {
            color: activeTab === tab ? '#fff' : currentColors.text,
            fontWeight: '600',
            fontSize: 13,
            marginRight: count > 0 ? 6 : 0,
          },
        ]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View style={{
          backgroundColor: activeTab === tab ? '#fff' : currentColors.primary,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
        }}>
          <Text style={{
            color: activeTab === tab ? currentColors.primary : '#fff',
            fontSize: 11,
            fontWeight: '700',
          }}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const ItemRow = ({ expense }: { expense: Expense }) => {
    const monthly = calculateMonthlyAmount(expense.amount, expense.frequency);
    const end = (expense as any).endDate ? String((expense as any).endDate).slice(0, 10) : '';
    
    const people = data && data.people && Array.isArray(data.people) ? data.people : [];
    const person = expense.personId ? people.find((p) => p && p.id === expense.personId) : null;

    const today = new Date();
    const endDate = new Date(end + 'T00:00:00');
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysUntilEnd < 0;

    return (
      <View
        style={[
          themedStyles.card,
          {
            backgroundColor: currentColors.backgroundAlt,
            borderColor: isExpired ? currentColors.error + '30' : currentColors.warning + '30',
            borderWidth: 1,
            marginBottom: 12,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[themedStyles.text, { fontWeight: '700', marginBottom: 4 }]}>
              {expense.description}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              {expense.category === 'personal' && person && (
                <>
                  <Icon name="person" size={12} style={{ color: currentColors.personal, marginRight: 4 }} />
                  <Text style={[themedStyles.textSecondary, { fontSize: 12, marginRight: 8 }]}>
                    {person.name}
                  </Text>
                </>
              )}
              {expense.category === 'household' && (
                <>
                  <Icon name="home" size={12} style={{ color: currentColors.household, marginRight: 4 }} />
                  <Text style={[themedStyles.textSecondary, { fontSize: 12, marginRight: 8 }]}>
                    Household
                  </Text>
                </>
              )}
              <Text style={[themedStyles.textSecondary, { fontSize: 12 }]}>
                {expense.frequency}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon 
                name={isExpired ? "close-circle" : "time"} 
                size={12} 
                style={{ 
                  color: isExpired ? currentColors.error : currentColors.warning, 
                  marginRight: 4 
                }} 
              />
              <Text style={[
                themedStyles.textSecondary, 
                { 
                  fontSize: 12,
                  color: isExpired ? currentColors.error : currentColors.warning,
                  fontWeight: '600'
                }
              ]}>
                {isExpired 
                  ? `Expired ${Math.abs(daysUntilEnd)} days ago`
                  : daysUntilEnd === 0 
                    ? 'Expires today'
                    : `Expires in ${daysUntilEnd} days`
                }
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={[
                themedStyles.text,
                {
                  fontWeight: '700',
                  color: expense.category === 'household' ? currentColors.household : currentColors.personal,
                  marginBottom: 2,
                },
              ]}
            >
              {formatCurrency(expense.amount)}
            </Text>
            <Text style={[themedStyles.textSecondary, { fontSize: 11 }]}>
              {formatCurrency(monthly)}/mo
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleExtend(expense)}
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.primary,
                borderColor: currentColors.primary,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 0,
                flex: 1,
                alignItems: 'center',
              },
            ]}
          >
            <Text style={[themedStyles.text, { color: '#fff', fontWeight: '600', fontSize: 13 }]}>
              Extend
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(expense)}
            style={[
              themedStyles.card,
              {
                backgroundColor: currentColors.error + '20',
                borderColor: currentColors.error,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 0,
                flex: 1,
                alignItems: 'center',
              },
            ]}
          >
            <Text style={[themedStyles.text, { color: currentColors.error, fontWeight: '600', fontSize: 13 }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const list = activeTab === 'ending' ? endingSoonList : endedList;

  return (
    <View style={[themedStyles.card, { marginBottom: 0 }]}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <TabButton tab="ending" label="Ending Soon" count={endingSoonList.length} />
        <TabButton tab="ended" label="Expired" count={endedList.length} />
      </View>

      {!list || !Array.isArray(list) || list.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Icon 
            name={activeTab === 'ending' ? "checkmark-circle-outline" : "archive-outline"} 
            size={48} 
            style={{ color: currentColors.textSecondary, marginBottom: 12 }} 
          />
          <Text style={[themedStyles.textSecondary, { textAlign: 'center' }]}>
            No {activeTab === 'ending' ? 'ending soon' : 'expired'} recurring expenses
          </Text>
        </View>
      ) : (
        list.map((expense) => expense && expense.id ? <ItemRow key={expense.id} expense={expense} /> : null)
      )}

      {extendTarget && (
        <DateTimePicker
          value={extendTarget.current ? new Date(extendTarget.current + 'T00:00:00') : new Date()}
          mode="date"
          display="default"
          onChange={onDatePicked}
        />
      )}
    </View>
  );
}
