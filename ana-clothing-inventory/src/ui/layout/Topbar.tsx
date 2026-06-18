import { useEffect, useState } from "react"
import { Menu, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSyncMetrics } from "../../sync/sync-monitor"
import { supabase, isAuthEnabled } from "../../auth/auth-service"

type SyncState = "synced" | "syncing" | "offline" | "unconfigured" | "error" | "unknown"

interface TopbarProps {
  title: string
  onMenuClick?: () => void
}

const dotColors: Record<SyncState, string> = {
  synced: "bg-success",
  syncing: "bg-accent",
  offline: "bg-error",
  unconfigured: "bg-muted",
  error: "bg-error",
  unknown: "bg-muted",
}


export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const [syncState, setSyncState] = useState<SyncState>("unknown")
  const [errorMsg, setErrorMsg] = useState<string>("")

  useEffect(() => {
    async function check() {
      try {
        const metrics = await getSyncMetrics()
        
        // Also check if there's an actual error we can display
        const { db } = await import("../../db/database")
        const stuck = await db.sync_queue.where("status").anyOf("PENDING", "FAILED").toArray()
        const retried = stuck.filter(i => (i.retries ?? 0) > 0)
        
        if (!metrics.isOnline) {
          setSyncState("offline")
          setErrorMsg("")
        }
        else if (!metrics.isConfigured) {
          setSyncState("unconfigured")
          setErrorMsg("")
        }
        else if (retried.length > 0) {
          setSyncState("error")
          // If we attached an error_msg in markFailed, show it. Otherwise show generic.
          const msg = (retried[0] as any).error_msg || `Failing to sync ${retried[0].type}`
          setErrorMsg(msg)
        }
        else if (metrics.retryQueueSize > 0) {
          setSyncState("syncing")
          setErrorMsg("")
        }
        else {
          setSyncState("synced")
          setErrorMsg("")
        }
      } catch {
        setSyncState("unknown")
        setErrorMsg("")
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
        {syncState === "error" ? (
          <div className="flex items-center gap-1.5 text-xs text-error px-2.5 py-1 rounded-full bg-error/10 font-medium max-w-[300px] truncate" title={errorMsg}>
            <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 bg-error animate-pulse" />
            {errorMsg}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted px-2.5 py-1 rounded-full bg-black/3">
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block flex-shrink-0", dotColors[syncState])} />
            {syncState === "syncing" ? "Syncing..." : (syncState === "synced" ? "Synced" : syncState)}
          </div>
        )}
        
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