import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useTripStore } from "@/lib/store";
import { Check } from "lucide-react";

export const Route = createFileRoute("/join/$inviteCode")({
  head: () => ({ meta: [{ title: "Join trip · TripOS" }] }),
  component: JoinTrip,
});

function JoinTrip() {
  const { inviteCode } = useParams({ from: "/join/$inviteCode" });
  const trips = useTripStore((s) => s.trips);
  const trip = Object.values(trips).find((t) => t.inviteCode === inviteCode);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          {trip ? `You're invited to ${trip.name}` : "Invite link"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Code: <span className="font-mono">{inviteCode}</span>
        </p>
        {trip ? (
          <Link
            to="/trip/$tripId"
            params={{ tripId: trip.id }}
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
          >
            Open trip
          </Link>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">This trip could not be found in your workspace.</p>
        )}
      </div>
    </div>
  );
}
