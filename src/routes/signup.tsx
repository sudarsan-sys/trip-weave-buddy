import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, UserPlus, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up · TripOS" },
      { name: "description", content: "Create your TripOS account and start planning trips with friends." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { signUp, checkUsername, isLoggedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isLoggedIn) {
      const pendingCode = localStorage.getItem("pendingInvite");
      if (pendingCode) {
        localStorage.removeItem("pendingInvite");
        navigate({ to: `/join/${pendingCode}` });
      } else {
        navigate({ to: "/dashboard" });
      }
    }
  }, [isLoggedIn, navigate]);

  if (isLoggedIn) {
    return null;
  }

  // Debounced username check
  useEffect(() => {
    if (!username.trim() || username.length < 3) {
      setUsernameTaken(null);
      return;
    }
    setCheckingUsername(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const taken = await checkUsername(username);
        setUsernameTaken(taken);
      } catch {
        setUsernameTaken(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [username, checkUsername]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameTaken) return;
    setError("");
    setLoading(true);
    try {
      // 1. Check if email is already taken
      const { data: existingUser, error: queryErr } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email.trim().toLowerCase())
        .maybeSingle();

      if (queryErr) throw queryErr;
      if (existingUser) {
        throw new Error("Email address is already registered.");
      }

      // 2. Perform GoTrue signup
      await signUp(email, password, username, displayName || username);
      const pendingCode = localStorage.getItem("pendingInvite");
      if (pendingCode) {
        localStorage.removeItem("pendingInvite");
        navigate({ to: `/join/${pendingCode}` });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setError(err.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg">
              T
            </div>
            <h1 className="font-display text-2xl font-semibold">Create account</h1>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Sudarsan"
                className={inputCls}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Username <span className="text-muted-foreground font-normal">(friends will invite you with this)</span>
              </label>
              <div className="relative">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  placeholder="sudarsan"
                  required
                  minLength={3}
                  maxLength={30}
                  className={inputCls + " pr-10"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!checkingUsername && usernameTaken === false && <Check className="h-4 w-4 text-success" />}
                  {!checkingUsername && usernameTaken === true && <X className="h-4 w-4 text-destructive" />}
                </span>
              </div>
              {usernameTaken === true && (
                <p className="mt-1 text-xs text-destructive">Username is already taken</p>
              )}
              {!checkingUsername && usernameTaken === false && (
                <p className="mt-1 text-xs text-success">Username is available!</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className={inputCls + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              disabled={loading || usernameTaken === true || !username.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary transition text-sm";
