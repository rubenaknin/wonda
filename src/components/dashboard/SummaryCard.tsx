import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface SummaryCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  accentColor?: string
  children?: React.ReactNode
}

export function SummaryCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accentColor = "text-[#0061FF]",
  children,
}: SummaryCardProps) {
  return (
    <Card className="wonda-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br from-white to-[#F8FAFC] border border-border shadow-sm`}>
            <Icon className={`h-5 w-5 ${accentColor}`} />
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  )
}
