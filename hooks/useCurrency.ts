
import { useState, useEffect, useCallback } from 'react';
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

// Global currency state to ensure all components stay in sync
let globalCurrency: Currency = CURRENCIES[0];
let globalCurrencyListeners: Set<(currency: Currency) => void> = new Set();

const notifyListeners = (currency: Currency) => {
  console.log('useCurrency: Notifying', globalCurrencyListeners.size, 'listeners of currency change:', currency);
  globalCurrencyListeners.forEach(listener => {
    try {
      listener(currency);
    } catch (error) {
      console.error('useCurrency: Error notifying listener:', error);
    }
  });
};

export const useCurrency = () => {
  const [currency, setCurrencyState] = useState<Currency>(globalCurrency);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  useEffect(() => {
    // Subscribe to global currency changes
    const listener = (newCurrency: Currency) => {
      console.log('useCurrency: Received currency update:', newCurrency);
      setCurrencyState(newCurrency);
    };
    
    globalCurrencyListeners.add(listener);
    
    // Cleanup listener on unmount
    return () => {
      globalCurrencyListeners.delete(listener);
    };
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
          globalCurrency = foundCurrency;
          setCurrencyState(foundCurrency);
          // Don't notify listeners here as this is initial load
        }
      } else {
        console.log('useCurrency: No saved currency found, using default USD');
        globalCurrency = CURRENCIES[0];
        setCurrencyState(CURRENCIES[0]);
      }
    } catch (error) {
      console.error('useCurrency: Error loading currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrency = useCallback(async (newCurrency: Currency) => {
    try {
      console.log('useCurrency: Saving currency:', newCurrency);
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(newCurrency));
      
      // Update global state and notify all listeners
      globalCurrency = newCurrency;
      setCurrencyState(newCurrency);
      notifyListeners(newCurrency);
      
      console.log('useCurrency: Currency saved and broadcasted successfully');
    } catch (error) {
      console.error('useCurrency: Error saving currency:', error);
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
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
  }, [currency]);

  return {
    currency,
    setCurrency: saveCurrency,
    formatCurrency,
    loading,
    availableCurrencies: CURRENCIES,
  };
};
