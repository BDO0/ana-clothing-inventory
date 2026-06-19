// Login — secure entry point with brute-force lockout
import { useState, useEffect, useRef } from "react";
import { supabase } from "../auth/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, AlertCircle, ShieldAlert } from "lucide-react";

// Max failed attempts before a lockout is triggered
const MAX_ATTEMPTS = 5;
// Base lockout duration in seconds (doubles each lockout: 30 → 60 → 120...)
const BASE_LOCKOUT_SECONDS = 30;

// Generic error message — never expose Supabase's internal error strings to prevent
// account enumeration (attacker can't tell if email exists vs. wrong password)
const GENERIC_AUTH_ERROR = "Invalid email or password. Please try again.";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Brute-force state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);
  const lockoutMultiplierRef = useRef(1);

  // Countdown timer during lockout
  useEffect(() => {
    if (lockoutUntil === null) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutSecondsLeft(0);
        setError(null);
      } else {
        setLockoutSecondsLeft(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || isLockedOut) return;

    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Increment failed attempts
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          // Trigger lockout — duration doubles with each lockout cycle
          const lockoutSeconds = BASE_LOCKOUT_SECONDS * lockoutMultiplierRef.current;
          lockoutMultiplierRef.current = Math.min(lockoutMultiplierRef.current * 2, 16); // cap at 16x = 8 min
          const until = Date.now() + lockoutSeconds * 1000;
          setLockoutUntil(until);
          setLockoutSecondsLeft(lockoutSeconds);
          setFailedAttempts(0); // reset count for next cycle
          setError(`Too many failed attempts. Please wait ${lockoutSeconds} seconds.`);
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          // Use generic error — don't expose Supabase internals
          setError(`${GENERIC_AUTH_ERROR} (${remaining} attempt${remaining !== 1 ? "s" : ""} remaining)`);
        }
      }
      // On success: onAuthStateChange in App.tsx handles redirect — no action needed here
    } catch {
      setError(GENERIC_AUTH_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[400px] z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/20">
            <span className="text-white font-serif font-bold text-2xl italic tracking-wider">A</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-text mb-2">ANA Clothing</h1>
          <p className="text-muted text-sm">Secure Inventory Management</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface border border-border p-8 rounded-[24px] shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-6">Sign In</h2>

          {isLockedOut && (
            <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-error leading-tight font-semibold">Account temporarily locked</p>
                <p className="text-xs text-error/80 mt-0.5">
                  Too many failed attempts. Try again in{" "}
                  <span className="font-bold tabular-nums">{lockoutSecondsLeft}s</span>.
                </p>
              </div>
            </div>
          )}

          {error && !isLockedOut && (
            <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
              <span className="text-sm text-error leading-tight">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted font-medium ml-1">Email Address</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-muted" />
                </div>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@anaclothing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 bg-bg border-border rounded-xl focus-visible:ring-accent"
                  required
                  disabled={isLockedOut}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted font-medium ml-1">Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-muted" />
                </div>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11 bg-bg border-border rounded-xl focus-visible:ring-accent"
                  required
                  disabled={isLockedOut}
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full mt-8 h-11 rounded-xl bg-accent hover:bg-accent-light text-white transition-colors"
            disabled={loading || !email || !password || isLockedOut}
          >
            {loading ? "Authenticating..." : isLockedOut ? `Locked (${lockoutSecondsLeft}s)` : "Secure Login"}
          </Button>
        </form>
        
        <p className="text-center text-xs text-muted mt-8">
          Protected by Supabase Encryption
        </p>
      </div>
    </div>
  );
}
