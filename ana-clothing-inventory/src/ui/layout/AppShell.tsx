// AppShell — responsive layout with mobile drawer support
// Premium maroon + dirty white aesthetic
import { useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: ReactNode
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products",
  "/stock-in": "Stock In",
  "/sales": "Sales",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/history": "History",
  "/system-test": "System Test",
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? "Inventory"
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Sidebar — hidden off-screen on mobile, slides in when open */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "fixed inset-0 z-[90] bg-black/40",
            "md:hidden"
          )}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 max-w-[100vw]">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 animate-[fadeIn_0.3s_ease]">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}