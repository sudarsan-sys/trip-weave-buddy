import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY env vars");
}

const isBrowser = typeof window !== "undefined";

const customStorage = {
  getItem(key: string): string | null {
    if (!isBrowser) return null;
    
    // 1. Try to get from localStorage
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;

    // 2. Fallback to cookies
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        const val = c.substring(name.length, c.length);
        // Sync to localStorage
        localStorage.setItem(key, val);
        return val;
      }
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (!isBrowser) return;
    
    // 1. Set in localStorage
    localStorage.setItem(key, value);

    // 2. Set in cookie (secure, samesite=lax, path=/)
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
  },
  removeItem(key: string): void {
    if (!isBrowser) return;
    
    // 1. Remove from localStorage
    localStorage.removeItem(key);

    // 2. Remove from cookies
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  }
});
