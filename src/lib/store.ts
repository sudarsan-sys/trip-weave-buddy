import { create } from "zustand";

/* ============================================================
 * UI-only state — no more mock data.
 * All trip data comes from Supabase via TanStack Query hooks.
 * ============================================================ */

interface UIState {
  /** Active tab in the trip dashboard */
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

/* ============================================================
 * Avatar helpers (kept from original)
 * ============================================================ */
export const memberInitials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const avatarColor = (id: string) => {
  const palette = ["bg-terracotta", "bg-forest", "bg-primary", "bg-warning", "bg-success"];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};
