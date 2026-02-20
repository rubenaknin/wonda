import { toast } from "sonner"
import { Check } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useWebhook } from "@/context/WebhookContext"
import { usePlan } from "@/context/PlanContext"
import { WEBHOOK_WORKFLOWS, PLAN_DETAILS } from "@/lib/constants"
import type { PricingTier } from "@/types"

export function SettingsPage() {
  const { webhookUrls, updateWebhookUrl, hasAnyWebhook } = useWebhook()
  const { plan, selectPlan } = usePlan()

  const handleSave = () => {
    toast.success("Webhook settings saved")
  }

  const handleSelectPlan = (tier: PricingTier) => {
    if (tier === "enterprise") {
      toast.info("Contact sales for Enterprise pricing")
      return
    }
    selectPlan(tier)
    toast.success(`Switched to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan`)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your Wonda workspace.
        </p>
      </div>

      <Card className="wonda-card">
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>
            Choose the plan that fits your content needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_DETAILS.map((p) => {
              const isActive = plan.tier === p.tier
              return (
                <button
                  key={p.tier}
                  onClick={() => handleSelectPlan(p.tier)}
                  className={`text-left rounded-lg p-4 border transition-all ${
                    isActive
                      ? "border-[#0061FF] bg-[#0061FF]/5"
                      : "border-border bg-white hover:border-[#0061FF]/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{p.name}</span>
                    {isActive && (
                      <Badge className="bg-[#0061FF]/10 text-[#0061FF] text-[10px]">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold mb-3">
                    {p.price !== null ? (
                      <>
                        ${p.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /mo
                        </span>
                      </>
                    ) : (
                      <span className="text-base">Talk to Sales</span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <Check className="h-3 w-3 mt-0.5 text-[#10B981] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="wonda-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Admin: n8n Workflows
            {hasAnyWebhook && (
              <Badge variant="secondary" className="text-xs">
                Connected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configure the webhook URLs for each n8n workflow. Each action in
            Wonda triggers a specific workflow endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {WEBHOOK_WORKFLOWS.map((workflow, index) => (
            <div key={workflow.key}>
              {index > 0 && <Separator className="mb-6 bg-[#F8FAFC]" />}
              <div className="space-y-2">
                <Label htmlFor={workflow.key} className="text-sm font-medium">
                  {workflow.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {workflow.description}
                </p>
                <Input
                  id={workflow.key}
                  type="url"
                  value={webhookUrls[workflow.key]}
                  onChange={(e) =>
                    updateWebhookUrl(workflow.key, e.target.value)
                  }
                  placeholder={`https://your-n8n-instance.com/webhook/${workflow.key}...`}
                />
              </div>
            </div>
          ))}

          <Button onClick={handleSave} className="w-full">
            Save Webhook Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
