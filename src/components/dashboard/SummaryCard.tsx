import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface SummaryCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  accentColor?: string
}

export function SummaryCard({
  label,
  value,
  icon: Icon,
  accentColor = "text-purple-400",
}: SummaryCardProps) {
  return (
    <Card className="glass">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="p-2.5 rounded-lg bg-white/5">
          <Icon className={`h-5 w-5 ${accentColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
