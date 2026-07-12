import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase, isAuthEnabled } from "./auth/auth-service";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { SkeletonStyles } from "./ui/components/Skeleton";
import AppShell from "./ui/layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import StockIn from "./pages/StockIn";
import Sales from "./pages/Sales";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import History from "./pages/History";
import Returns from "./pages/Returns";
import Adjustments from "./pages/Adjustments";
import Ledger from "./pages/Ledger";
import PWAInstallPrompt from "./ui/components/PWAInstallPrompt";

// Only import SystemTest in development — excluded from production bundle entirely
const SystemTest = import.meta.env.DEV
  ? (await import("./dev/SystemTest")).default
  : null;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isAuthEnabled());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center font-serif text-accent font-bold italic text-2xl tracking-wider">A</div>;
  }

  if (isAuthEnabled() && !session) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <SkeletonStyles />
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/stock-in" element={<StockIn />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/adjustments" element={<Adjustments />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/history" element={<History />} />
          {/* /system-test is only registered in development mode */}
          {import.meta.env.DEV && SystemTest && (
            <Route path="/system-test" element={<SystemTest />} />
          )}
        </Routes>
      </AppShell>
      <PWAInstallPrompt />
    </ErrorBoundary>
  );
}
