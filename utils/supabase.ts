
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = 'https://xstkicbptwjnkyyyhaci.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdGtpY2JwdHdqbmt5eXloYWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzQ0MTksImV4cCI6MjA3MDY1MDQxOX0.FlSIPI2eUAIBVIRwP2pCB2StTaYKqONr5RNZ7Ku5dBA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Add retry configuration for better reliability
    retryAttempts: 3,
    // Storage key to avoid conflicts
    storageKey: 'supabase.auth.token',
  },
});

export const AUTH_REDIRECT = 'budgetflow://auth/callback';
export const AUTH_REDIRECT_HTTPS = 'https://natively.dev/email-confirmed';
