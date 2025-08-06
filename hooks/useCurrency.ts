
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
      console.log('useCurrency: Loading currency from storage...');
      const savedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      if (savedCurrency) {
        const parsedCurrency = JSON.parse(savedCurrency);
        const foundCurrency = CURRENCIES.find(c => c.code === parsedCurrency.code);
        if (foundCurrency) {
          console.log('useCurrency: Loaded currency:', foundCurrency);
          setCurrency(foundCurrency);
        }
      } else {
        console.log('useCurrency: No saved currency found, using default USD');
      }
    } catch (error) {
      console.error('useCurrency: Error loading currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrency = async (newCurrency: Currency) => {
    try {
      console.log('useCurrency: Saving currency:', newCurrency);
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(newCurrency));
      setCurrency(newCurrency);
      console.log('useCurrency: Currency saved successfully');
    } catch (error) {
      console.error('useCurrency: Error saving currency:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      console.error('useCurrency: Error formatting currency:', error);
      // Fallback to simple formatting
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  };

  return {
    currency,
    setCurrency: saveCurrency,
    formatCurrency,
    loading,
    availableCurrencies: CURRENCIES,
  };
};
