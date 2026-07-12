import type { TripMember } from "@/lib/types";

export const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-primary transition text-sm";

export function nameOf(members: TripMember[], userId: string) {
  const m = members.find((x) => x.user_id === userId);
  return m?.profiles?.display_name || m?.profiles?.username || "Unknown";
}
