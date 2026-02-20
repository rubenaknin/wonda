import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
    <Card className="wonda-card hover:border-[#0061FF] hover:shadow-md transition-all duration-200 cursor-pointer">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#0061FF]/5">
            <Icon className="h-5 w-5 text-[#0061FF]" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onAction} className="w-full">
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
