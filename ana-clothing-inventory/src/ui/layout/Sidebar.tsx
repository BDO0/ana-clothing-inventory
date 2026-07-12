// Sidebar — premium maroon sidebar with grouped navigation, flush active indicator, actual logo
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ShoppingCart,
  Undo2,
  SlidersHorizontal,
  BarChart3,
  FileText,
  History,
  CalendarDays,
} from "lucide-react"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}

const sections: { label: string; links: NavItem[] }[] = [
  {
    label: "Core",
    links: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/products", icon: Package, label: "Products" },
    ],
  },
  {
    label: "Transactions",
    links: [
      { to: "/stock-in", icon: PackagePlus, label: "Stock In" },
      { to: "/sales", icon: ShoppingCart, label: "Sales" },
      { to: "/returns", icon: Undo2, label: "Returns" },
      { to: "/adjustments", icon: SlidersHorizontal, label: "Adjustments" },
    ],
  },
  {
    label: "Analysis",
    links: [
      { to: "/ledger", icon: CalendarDays, label: "Ledger" },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/reports", icon: FileText, label: "Reports" },
      { to: "/history", icon: History, label: "History" },
    ],
  },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className={cn(
        "w-56 flex-shrink-0 flex flex-col bg-sidebar-bg min-h-screen",
        "hidden md:flex"
      )}>
        <SidebarContent onClose={onClose} />
      </aside>

      {/* Mobile sidebar — slides in */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[100] w-56 flex-shrink-0 flex flex-col bg-sidebar-bg transition-transform duration-200",
        "md:hidden",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  )
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Brand — uses actual logo */}
      <div className="px-5 pt-7 pb-6 flex justify-center">
        <img
          src="/sidebar-logo.png"
          alt="ANA Inventory"
          className="h-16 w-auto max-w-full object-contain drop-shadow-md"
        />
      </div>

      {/* Divider */}
      <div className="mx-5 mb-4 h-px bg-white/[0.08]" />

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1.5">
            {/* Section label */}
            <div className="px-3 text-[10px] font-semibold tracking-[0.15em] uppercase text-[#FFFDF9]/40 select-none">
              {section.label}
            </div>

            {/* Section links */}
            <div className="space-y-1">
              {section.links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onClose}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg select-none",
                    isActive
                      ? "bg-surface text-accent shadow-[0_4px_12px_rgba(0,0,0,0.12)] font-semibold scale-[1.02]"
                      : "text-white/70 hover:text-white hover:bg-white/[0.06] hover:translate-x-1"
                  )}
                >
                  <Icon size={16} className="flex-shrink-0 opacity-80" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-7 py-4 text-[#FFFDF9]/30 text-[10px] tracking-wider border-t border-white/[0.04] bg-black/10 select-none">
        SYSTEM VERSION 0.1.0
      </div>
    </>
  )
}