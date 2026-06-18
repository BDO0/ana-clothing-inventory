// Badge — now wrapping shadcn Badge for backward compatibility
import type { ReactNode } from "react"
import { Badge as ShadcnBadge, type BadgeProps as ShadcnBadgeProps } from "@/components/ui/badge"

interface BadgeProps {
  children: ReactNode
  variant?: ShadcnBadgeProps["variant"]
  className?: string
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return <ShadcnBadge variant={variant} className={className}>{children}</ShadcnBadge>
}