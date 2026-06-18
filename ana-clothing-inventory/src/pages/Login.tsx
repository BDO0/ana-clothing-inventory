// Login — premium, high-converting entry point
import { useState } from "react";
import { supabase } from "../auth/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }
      
      // If successful, the onAuthStateChange listener in App.tsx will auto-redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
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

          {error && (
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
                  type="email"
                  placeholder="admin@anaclothing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 bg-bg border-border rounded-xl focus-visible:ring-accent"
                  required
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
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11 bg-bg border-border rounded-xl focus-visible:ring-accent"
                  required
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full mt-8 h-11 rounded-xl bg-accent hover:bg-accent-light text-white transition-colors"
            disabled={loading || !email || !password}
          >
            {loading ? "Authenticating..." : "Secure Login"}
          </Button>
        </form>
        
        <p className="text-center text-xs text-muted mt-8">
          Protected by Supabase Encryption
        </p>
      </div>
    </div>
  );
}
