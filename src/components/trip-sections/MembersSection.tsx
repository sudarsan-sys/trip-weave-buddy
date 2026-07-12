import { useState } from "react";
import { useTripMembers } from "@/hooks/use-trip";
import { useTrip } from "@/hooks/use-trip";
import { Copy, Check, Crown, User } from "lucide-react";

function avatarColor(id: string) {
  const colors = [
    "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500",
    "bg-violet-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MembersSection({ tripId }: { tripId: string }) {
  const { data: members = [], isLoading } = useTripMembers(tripId);
  const { data: trip } = useTrip(tripId);
  const [copied, setCopied] = useState(false);

  const inviteCode = trip?.invite_code ?? "";
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${inviteCode}`
    : "";

  const copyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header + invite */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-semibold">Members</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {members.length} traveler{members.length !== 1 ? "s" : ""} in this trip
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono select-all">
              {inviteCode || "—"}
            </div>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy invite link"}
            </button>
          </div>
        </div>
      </div>

      {/* Members grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5 h-20" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="font-display text-lg font-semibold">No members yet</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Share the invite code above to add travelers to this trip.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const profile = m.profiles;
            const displayName = profile?.display_name || profile?.username || "Unknown";
            const username = profile?.username || "—";
            const isOrganizer = m.role === "organizer";

            return (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition"
              >
                {/* Avatar */}
                <div
                  className={
                    "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white " +
                    avatarColor(m.user_id)
                  }
                  title={displayName}
                >
                  {initials(displayName)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold truncate">{displayName}</div>
                    {isOrganizer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                        <Crown className="h-3 w-3" /> Organizer
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">@{username}</div>
                </div>

                {/* Role icon */}
                <div className="shrink-0">
                  {isOrganizer ? (
                    <Crown className="h-4 w-4 text-amber-500" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
