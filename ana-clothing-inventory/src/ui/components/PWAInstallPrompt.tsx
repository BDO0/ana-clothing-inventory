// PWAInstallPrompt — smart install banner
// Only appears when the browser fires beforeinstallprompt (Chrome/Edge/Android)
// Dismissed state is persisted to localStorage so it never re-appears after dismissal

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "pwa-install-dismissed"

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if user already dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setVisible(false)
      setDeferredPrompt(null)
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1")
    setVisible(false)
    setDeferredPrompt(null)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-surface border border-border rounded-2xl shadow-xl p-4 flex gap-3 items-start">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Download size={18} className="text-accent" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text mb-0.5">Install ANA Inventory</p>
          <p className="text-xs text-muted leading-relaxed">
            Add to your home screen for fast, offline access — no App Store needed.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="h-7 text-xs px-3" onClick={handleInstall}>
              Install App
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-muted hover:text-text transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
