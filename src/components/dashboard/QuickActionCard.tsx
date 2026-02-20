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
  accentColor?: string
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  accentColor = "from-purple-500/20 to-blue-500/20",
}: QuickActionCardProps) {
  return (
    <Card
      className={`glass bg-gradient-to-br ${accentColor} hover:scale-[1.02] transition-transform duration-300 cursor-pointer`}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            <Icon className="h-5 w-5 text-purple-400" />
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
