import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useJoinViaCode } from "@/hooks/use-trip";
import { Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/join/$inviteCode")({
  head: () => ({ meta: [{ title: "Join trip · TripOS" }] }),
  component: JoinTrip,
});

function JoinTrip() {
  const { inviteCode } = useParams({ from: "/join/$inviteCode" });
  const navigate = useNavigate();
  const { isLoggedIn, isInitialized } = useAuth();
  const joinMut = useJoinViaCode();
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isLoggedIn) {
      localStorage.setItem("pendingInvite", inviteCode);
    } else if (isLoggedIn && !autoJoinAttempted && !joined) {
      setAutoJoinAttempted(true);
      handleJoin();
    }
  }, [isInitialized, isLoggedIn, inviteCode, autoJoinAttempted, joined]);

  const handleJoin = async () => {
    setError("");
    try {
      const trip = await joinMut.mutateAsync(inviteCode);
      setTripId(trip.id);
      setJoined(true);
      navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
    } catch (err: any) {
      setError(err.message ?? "Failed to join trip");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          You're invited!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite code: <span className="font-mono">{inviteCode}</span>
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isInitialized ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isLoggedIn ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">Sign up or log in to join this trip.</p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/signup"
                className="rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
              >
                Sign up
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-border px-6 py-3 hover:bg-secondary"
              >
                Log in
              </Link>
            </div>
          </div>
        ) : joined && tripId ? (
          <div className="mt-6">
            <p className="text-sm text-success font-medium">You've joined the trip! 🎉</p>
            <Link
              to="/trip/$tripId"
              params={{ tripId }}
              className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
            >
              Open trip
            </Link>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joinMut.isPending}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {joinMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Join this trip
          </button>
        )}
      </div>
    </div>
  );
}
