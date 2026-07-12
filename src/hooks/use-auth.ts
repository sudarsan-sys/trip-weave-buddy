import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

/* ============================================================
 * Auth state — shared singleton so every component gets the
 * same session without re-subscribing.
 * ============================================================ */
let currentSession: Session | null = null;
let currentProfile: Profile | null = null;
let listeners = new Set<() => void>();
let initialized = false;

const isBrowser = typeof window !== "undefined";

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  if (!isBrowser) return () => {};
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

if (isBrowser) {
  // Init once
  const initPromise = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    currentSession = session;
    if (session?.user) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", session.user.id)
        .single();
      currentProfile = data;
    }
    initialized = true;
    notify();
  })();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentSession = session;
    if (session?.user) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", session.user.id)
        .single();
      currentProfile = data;
    } else {
      currentProfile = null;
    }
    initialized = true;
    notify();
  });
}

/* ============================================================
 * Hook: useAuth
 * ============================================================ */
export function useAuth() {
  const session = useSyncExternalStore(
    subscribe,
    () => currentSession,
    () => null,
  );
  const profile = useSyncExternalStore(
    subscribe,
    () => currentProfile,
    () => null,
  );
  const isInitialized = useSyncExternalStore(
    subscribe,
    () => initialized,
    () => false,
  );

  const user = session?.user ?? null;
  const isLoggedIn = !!user;

  const signUp = useCallback(
    async (email: string, password: string, username: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.toLowerCase(), display_name: displayName },
        },
      });
      if (error) throw error;
      return data;
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const checkUsername = useCallback(async (username: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", username.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return !!data; // true = taken
  }, []);

  return {
    session,
    user,
    profile,
    isLoggedIn,
    isInitialized,
    signUp,
    signIn,
    signOut,
    checkUsername,
  };
}
