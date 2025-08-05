
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

const CURRENCY_STORAGE_KEY = 'app_currency';

export const useCurrency = () => {
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]); // Default to USD
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      const savedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      if (savedCurrency) {
        const parsedCurrency = JSON.parse(savedCurrency);
        const foundCurrency = CURRENCIES.find(c => c.code === parsedCurrency.code);
        if (foundCurrency) {
          setCurrency(foundCurrency);
        }
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrency = async (newCurrency: Currency) => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(newCurrency));
      setCurrency(newCurrency);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
    }).format(amount);
  };

  return {
    currency,
    setCurrency: saveCurrency,
    formatCurrency,
    loading,
    availableCurrencies: CURRENCIES,
  };
};
