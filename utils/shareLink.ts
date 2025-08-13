
import Constants from 'expo-constants';
import { Budget } from '../types/budget';

// Utility: simple URI-encoded JSON "bfj:" offline payload for QR-only fallback.
// This keeps us independent of platform-specific base64/crypto at UI time.
export function buildOfflinePayload(budget: Budget) {
  const payload = {
    v: 1,
    type: 'budget',
    budget: {
      name: budget.name,
      people: budget.people,
      expenses: budget.expenses,
      householdSettings: budget.householdSettings,
    },
  };
  const text = JSON.stringify(payload);
  const encoded = encodeURIComponent(text);
  return `bfj:${encoded}`;
}

function parseOfflinePayload(text: string): { ok: true; data: any } | { ok: false; error: string } {
  try {
    if (!text.startsWith('bfj:')) return { ok: false, error: 'Not an offline payload' };
    const encoded = text.slice(4);
    const json = decodeURIComponent(encoded);
    const data = JSON.parse(json);
    if (!data || data.v !== 1 || data.type !== 'budget' || !data.budget) {
      return { ok: false, error: 'Invalid payload' };
    }
    return { ok: true, data };
  } catch (e) {
    console.log('parseOfflinePayload error', e);
    return { ok: false, error: 'Failed to parse payload' };
  }
}

function getExtra() {
  return (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra || {};
}

function getShareApiUrl(): string | null {
  const extra = getExtra();
  return extra?.shareApiUrl || null;
}

function getAnonKey(): string | null {
  const extra = getExtra();
  return extra?.supabaseAnonKey || null;
}

function getShareTtlSec(): number {
  const extra = getExtra();
  const ttl = Number(extra?.shareTtlSec || 86400);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 86400;
}

/**
  Tries to create a shareable link via backend Edge Function.
  If not configured or on error, it throws to allow UI to fallback to QR-only offline payload.
*/
export async function createShareLink(budget: Budget): Promise<{ url: string; code?: string; expiresAt?: string }> {
  const SHARE_API_URL = getShareApiUrl();
  const ANON_KEY = getAnonKey();
  if (!SHARE_API_URL || !ANON_KEY) {
    throw new Error('Share API not configured');
  }

  try {
    const payload = {
      v: 1,
      type: 'budget',
      budget: {
        name: budget.name,
        people: budget.people,
        expenses: budget.expenses,
        householdSettings: budget.householdSettings,
      },
    };

    const res = await fetch(`${SHARE_API_URL}/create-share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Supabase Edge Functions require a valid JWT; using anon key when not signed in
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ payload: JSON.stringify(payload), ttlSeconds: getShareTtlSec() }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Failed to create share');
    }
    const data = await res.json();
    // Expected: { code, url, expiresAt }
    return { url: data.url, code: data.code, expiresAt: data.expiresAt };
  } catch (e: any) {
    console.log('createShareLink error', e?.message || e);
    throw e;
  }
}

/**
  Fetches a shared budget from a link or code.
  Supports:
  - Offline QR-only "bfj:" payloads
  - URLs such as https://yourdomain/s/{code}
  - raw codes (when provided by the user)
*/
export async function fetchSharedBudget(input: string): Promise<{ budget: Omit<Budget, 'id' | 'createdAt'>; source: 'offline' | 'link' }> {
  // Check offline payload first
  const offlineParsed = parseOfflinePayload(input);
  if (offlineParsed.ok) {
    const b = offlineParsed.data.budget;
    return {
      budget: {
        name: b.name || 'Imported Budget',
        people: Array.isArray(b.people) ? b.people : [],
        expenses: Array.isArray(b.expenses) ? b.expenses : [],
        householdSettings: b.householdSettings || { distributionMethod: 'even' },
      },
      source: 'offline',
    };
  }

  // Otherwise, try link backend
  const SHARE_API_URL = getShareApiUrl();
  const ANON_KEY = getAnonKey();
  if (!SHARE_API_URL || !ANON_KEY) {
    throw new Error('Share API not configured. You can still import QR-only (offline) payloads.');
  }

  // Parse code from URL or treat raw input as code
  let code = input;
  try {
    if (input.startsWith('http')) {
      const u = new URL(input);
      const parts = u.pathname.split('/').filter(Boolean);
      const si = parts.indexOf('s');
      if (si >= 0 && parts.length > si + 1) {
        code = parts[si + 1];
      }
    }
  } catch (e) {
    // If URL parsing fails, we keep the original input as a potential code
    console.log('fetchSharedBudget: URL parse error, treating as code.');
  }

  const res = await fetch(`${SHARE_API_URL}/get-share?code=${encodeURIComponent(code)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Share not found or expired.');
  }
  const data = await res.json();
  // Expected: { payload: <string> }
  let parsed: any;
  try {
    parsed = JSON.parse(data.payload);
  } catch (e) {
    throw new Error('Invalid payload from server');
  }
  const b = parsed?.budget || {};
  return {
    budget: {
      name: b.name || 'Imported Budget',
      people: Array.isArray(b.people) ? b.people : [],
      expenses: Array.isArray(b.expenses) ? b.expenses : [],
      householdSettings: b.householdSettings || { distributionMethod: 'even' },
    },
    source: 'link',
  };
}
