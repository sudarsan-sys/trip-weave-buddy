import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TripOS — Plan group trips in one place" },
      { name: "description", content: "Plan with friends, split expenses, and keep every ticket and idea in one workspace." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { isLoggedIn, isInitialized } = useAuth();
  const navigate = useNavigate();

  // If logged in, redirect to dashboard
  useEffect(() => {
    if (isInitialized && isLoggedIn) {
      navigate({ to: "/dashboard" });
    }
  }, [isInitialized, isLoggedIn, navigate]);

  if (isInitialized && isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg">
            T
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">TripOS</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center -mt-20">
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" />
            One workspace instead of 5 apps
          </div>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-tight md:text-6xl">
            Plan the trip together.<br />
            <span className="text-terracotta">Actually together.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop juggling WhatsApp, Splitwise, Google Maps and Notion. TripOS is one place for
            packages, routes, expenses, and every idea your group throws around.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-full bg-primary px-8 py-4 text-primary-foreground shadow-sm hover:opacity-90 transition font-medium"
            >
              Get started for free
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
