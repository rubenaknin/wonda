import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface QuickActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  actionLabel: string
  onAction: () => void
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
}: QuickActionCardProps) {
  return (
    <Card
      className="wonda-card group hover:border-[#0061FF]/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onAction}
    >
      <CardContent className="p-6 space-y-4">
        <div className="p-3 rounded-xl bg-[#0061FF]/5 w-fit group-hover:bg-[#0061FF]/10 transition-colors">
          <Icon className="h-6 w-6 text-[#0061FF]" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="px-0 text-[#0061FF] hover:text-[#0061FF] hover:bg-transparent group-hover:translate-x-1 transition-transform"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
