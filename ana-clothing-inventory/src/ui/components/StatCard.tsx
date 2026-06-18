// StatCard — premium KPI metric card with icons, modern border/shadow transitions, and descriptions
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  accent?: "accent" | "success" | "error" | "warning" | "muted"
  warn?: boolean
  icon?: LucideIcon
  description?: string
  className?: string
}

const colorMaps = {
  accent: {
    border: "border-l-[#8B1A2A]",
    bg: "bg-[#8B1A2A]/[0.06]",
    text: "text-[#8B1A2A]",
  },
  success: {
    border: "border-l-[#2D7D46]",
    bg: "bg-[#2D7D46]/[0.06]",
    text: "text-[#2D7D46]",
  },
  error: {
    border: "border-l-[#C53030]",
    bg: "bg-[#C53030]/[0.06]",
    text: "text-[#C53030]",
  },
  warning: {
    border: "border-l-[#B8860B]",
    bg: "bg-[#B8860B]/[0.06]",
    text: "text-[#B8860B]",
  },
  muted: {
    border: "border-l-[#6B6661]",
    bg: "bg-[#6B6661]/[0.06]",
    text: "text-[#6B6661]",
  },
}

export default function StatCard({
  label,
  value,
  accent = "accent",
  warn = false,
  icon: Icon,
  description,
  className,
}: StatCardProps) {
  const activeAccent = warn ? "error" : accent
  const colors = colorMaps[activeAccent]

  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-xxl p-5 border-l-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)]",
        colors.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {label}
          </div>
          <div className={cn("text-2xl font-bold tracking-tight text-text")}>
            {value}
          </div>
          {description && (
            <div className="text-xs text-muted/80 font-medium">
              {description}
            </div>
          )}
        </div>

        {Icon && (
          <div className={cn("p-2.5 rounded-xl flex items-center justify-center shrink-0", colors.bg)}>
            <Icon size={18} className={colors.text} />
          </div>
        )}
      </div>
    </div>
  )
}