
import React, { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useBiometricLock } from '../hooks/useBiometricLock';

interface LockGateProps {
  children: React.ReactNode;
}

export default function LockGate({ children }: LockGateProps) {
  const { session, user, loading: authLoading } = useAuth();
  const { shouldLock, loading: biometricLoading } = useBiometricLock();
  const pathname = usePathname();
  const [appState, setAppState] = useState(AppState.currentState);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('LockGate: App state changed from', appState, 'to', nextAppState);
      
      // When app becomes active, check if we should lock
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('LockGate: App became active, checking lock status');
        checkLockStatus();
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  const checkLockStatus = useCallback(() => {
    // Don't check lock status if still loading or not authenticated
    if (authLoading || biometricLoading || !session || !user) {
      return;
    }

    // Don't lock if user hasn't verified email
    if (!user.email_confirmed_at) {
      return;
    }

    // Don't lock if already on auth routes
    if (pathname.startsWith('/auth/')) {
      return;
    }

    // Check if we should lock
    if (shouldLock()) {
      console.log('LockGate: Should lock, navigating to lock screen');
      router.replace('/auth/lock');
    }
  }, [authLoading, biometricLoading, session, user, pathname, shouldLock]);

  // Check lock status on mount and when dependencies change
  useEffect(() => {
    checkLockStatus();
  }, [checkLockStatus]);

  // Handle authentication state
  useEffect(() => {
    if (authLoading) {
      console.log('LockGate: Auth loading...');
      return;
    }

    // Don't redirect if already on auth routes - let the user navigate freely within auth
    if (pathname.startsWith('/auth/')) {
      console.log('LockGate: On auth route, allowing navigation:', pathname);
      
      // Only redirect to home if authenticated and verified
      if (session && user && user.email_confirmed_at && pathname !== '/auth/lock') {
        console.log('LockGate: Authenticated and verified, redirecting to home');
        router.replace('/');
      }
      return;
    }

    if (!session || !user) {
      console.log('LockGate: No session or user, redirecting to auth');
      router.replace('/auth');
      return;
    }

    if (!user.email_confirmed_at) {
      console.log('LockGate: Email not confirmed, redirecting to verify');
      router.replace('/auth/verify');
      return;
    }
  }, [session, user, authLoading, pathname]);

  return <>{children}</>;
}
