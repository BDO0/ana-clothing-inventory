// Card — now using shadcn Card wrapper for backward compatibility
// New code can import directly from @/components/ui/card
import type { ReactNode } from "react"
import { Card as ShadcnCard, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CardProps {
  children: ReactNode
  header?: string
  className?: string
  style?: React.CSSProperties
}

export default function Card({ children, header, className, style }: CardProps) {
  return (
    <ShadcnCard className={cn(className)} style={style}>
      {header && (
        <div className="px-5 pt-4 pb-0 font-semibold text-[13px] text-text tracking-tight">
          {header}
        </div>
      )}
      <CardContent className={header ? "pt-3 pb-5 px-5" : "p-5"}>
        {children}
      </CardContent>
    </ShadcnCard>
  )
}