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
  variant?: "default" | "primary"
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  variant = "default",
}: QuickActionCardProps) {
  const isPrimary = variant === "primary"

  return (
    <Card
      className={`wonda-card group hover:shadow-lg transition-all duration-300 cursor-pointer ${
        isPrimary
          ? "border-[#0061FF]/40 bg-gradient-to-br from-[#0061FF]/[0.03] to-transparent hover:border-[#0061FF]/60"
          : "hover:border-[#0061FF]/40"
      }`}
      onClick={onAction}
    >
      <CardContent className={`space-y-4 ${isPrimary ? "p-7" : "p-6"}`}>
        <div className={`rounded-xl w-fit transition-colors ${
          isPrimary
            ? "p-3.5 bg-[#0061FF]/10 group-hover:bg-[#0061FF]/15"
            : "p-3 bg-[#0061FF]/5 group-hover:bg-[#0061FF]/10"
        }`}>
          <Icon className={`text-[#0061FF] ${isPrimary ? "h-7 w-7" : "h-6 w-6"}`} />
        </div>
        <div className="space-y-1.5">
          <h3 className={`font-semibold ${isPrimary ? "text-lg" : "text-base"}`}>{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`px-0 text-[#0061FF] hover:text-[#0061FF] hover:bg-transparent group-hover:translate-x-1 transition-transform ${
            isPrimary ? "font-semibold" : ""
          }`}
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
