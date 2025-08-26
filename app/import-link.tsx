
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useBudgetData } from '../hooks/useBudgetData';
import { useTheme } from '../hooks/useTheme';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../hooks/useToast';
import { Budget } from '../types/budget';
import { fetchSharedBudget } from '../utils/shareLink';
import { loadAppData, saveAppData } from '../utils/storage';
import * as Clipboard from 'expo-clipboard';
import Icon from '../components/Icon';
import StandardHeader from '../components/StandardHeader';
import Button from '../components/Button';

// Dynamic import for barcode scanner (only available on mobile)
type ScannerModule = {
  BarCodeScanner: any;
  requestPermissionsAsync: () => Promise<{ status: string }>;
};

export default function ImportLinkScreen() {
  const params = useLocalSearchParams<{ link?: string }>();
  
  // Redirect to the new import-budget screen with any link parameter
  useEffect(() => {
    if (params.link) {
      router.replace(`/import-budget?link=${encodeURIComponent(params.link)}`);
    } else {
      router.replace('/import-budget');
    }
  }, [params.link]);

  return null;
}
