import { useEffect, useState } from "react"
import { Menu, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSyncMetrics } from "../../sync/sync-monitor"
import { supabase, isAuthEnabled } from "../../auth/auth-service"

type SyncState = "synced" | "syncing" | "offline" | "unconfigured" | "unknown"

interface TopbarProps {
  title: string
  onMenuClick?: () => void
}

const dotColors: Record<SyncState, string> = {
  synced: "bg-success",
  syncing: "bg-accent",
  offline: "bg-error",
  unconfigured: "bg-muted",
  unknown: "bg-muted",
}

const labels: Record<SyncState, string> = {
  synced: "Synced",
  syncing: "Syncing\u2026",
  offline: "Offline",
  unconfigured: "Local only",
  unknown: "\u2026",
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const [syncState, setSyncState] = useState<SyncState>("unknown")

  useEffect(() => {
    async function check() {
      try {
        const metrics = await getSyncMetrics()
        if (!metrics.isOnline) setSyncState("offline")
        else if (!metrics.isConfigured) setSyncState("unconfigured")
        else if (metrics.retryQueueSize > 0) setSyncState("syncing")
        else setSyncState("synced")
      } catch {
        setSyncState("unknown")
      }
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  function handleLogout() {
    if (supabase) {
      supabase.auth.signOut()
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 flex items-center justify-between px-6 min-h-[48px]",
      "bg-bg/85 backdrop-blur-[16px] border-b border-border"
    )}>
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="hidden max-md:flex bg-none border-none cursor-pointer text-text p-1.5 rounded-md"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="m-0 text-md font-semibold text-text tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted px-2.5 py-1 rounded-full bg-black/3">
          <span className={cn("w-1.5 h-1.5 rounded-full inline-block flex-shrink-0", dotColors[syncState])} />
          {labels[syncState]}
        </div>
        
        {isAuthEnabled() && (
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-error/10 text-error hover:bg-error/20 transition-colors"
            title="Sign Out"
          >
            <LogOut size={12} strokeWidth={2.5} />
          </button>
        )}

        {/* Avatar */}
        <div className="w-[30px] h-[30px] rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold tracking-wider">
          A
        </div>
      </div>
    </header>
  )
}