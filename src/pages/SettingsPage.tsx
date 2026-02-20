import { useState } from "react"
import { toast } from "sonner"
import { Check, Lock, Globe, Unplug } from "lucide-react"
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
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { usePlan } from "@/context/PlanContext"
import { PLAN_DETAILS, STORAGE_KEYS } from "@/lib/constants"
import type { PricingTier, CmsType, CmsIntegration, GscData } from "@/types"

const CMS_OPTIONS: { type: CmsType; label: string; fields: { key: string; label: string; placeholder: string }[] }[] = [
  {
    type: "framer",
    label: "Framer",
    fields: [{ key: "siteId", label: "Site ID", placeholder: "your-site-id" }],
  },
  {
    type: "webflow",
    label: "Webflow",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "wf_..." },
      { key: "siteId", label: "Site ID", placeholder: "your-site-id" },
    ],
  },
  {
    type: "wordpress",
    label: "WordPress",
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://yoursite.com" },
      { key: "apiKey", label: "API Key", placeholder: "your-api-key" },
    ],
  },
  {
    type: "google-sheets",
    label: "Google Sheets",
    fields: [{ key: "spreadsheetUrl", label: "Spreadsheet URL", placeholder: "https://docs.google.com/spreadsheets/d/..." }],
  },
  {
    type: "api",
    label: "API",
    fields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://your-api.com/webhook" }],
  },
]

const DEFAULT_GSC_DATA: GscData = {
  nonBrandedClicks: 12450,
  nonBrandedImpressions: 234000,
  blogClicks: 8230,
  blogImpressions: 156000,
  lastUpdated: new Date().toISOString(),
}

export function SettingsPage() {
  const { profile, updateProfile } = useCompanyProfile()
  const { plan, selectPlan } = usePlan()

  // CMS state
  const [cmsIntegration, setCmsIntegration] = useState<CmsIntegration>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CMS_INTEGRATION)
      return raw ? JSON.parse(raw) : { type: "framer", enabled: false, config: {} }
    } catch {
      return { type: "framer", enabled: false, config: {} }
    }
  })

  const handleSelectPlan = (tier: PricingTier) => {
    if (tier === "enterprise") {
      toast.info("Contact sales for Enterprise pricing")
      return
    }
    selectPlan(tier)
    toast.success(`Switched to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan`)
  }

  // GSC handlers
  const handleConnectGsc = () => {
    updateProfile({ gscConnected: true, gscPropertyUrl: profile.websiteUrl || "https://example.com" })
    localStorage.setItem(STORAGE_KEYS.GSC_DATA, JSON.stringify(DEFAULT_GSC_DATA))
    toast.success("Google Search Console connected")
  }

  const handleDisconnectGsc = () => {
    updateProfile({ gscConnected: false, gscPropertyUrl: "" })
    localStorage.removeItem(STORAGE_KEYS.GSC_DATA)
    toast.success("Google Search Console disconnected")
  }

  // CMS handlers
  const handleSelectCms = (type: CmsType) => {
    if (plan.tier !== "enterprise") return
    setCmsIntegration((prev) => ({ ...prev, type, enabled: true }))
  }

  const handleCmsConfigChange = (key: string, value: string) => {
    setCmsIntegration((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }))
  }

  const handleSaveCms = () => {
    localStorage.setItem(STORAGE_KEYS.CMS_INTEGRATION, JSON.stringify(cmsIntegration))
    toast.success("Publishing integration saved")
  }

  const selectedCmsOption = CMS_OPTIONS.find((o) => o.type === cmsIntegration.type)
  const isEnterprise = plan.tier === "enterprise"

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your Wonda workspace.
        </p>
      </div>

      {/* Plan Card */}
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

      {/* Google Search Console */}
      <Card className="wonda-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Google Search Console
            {profile.gscConnected && (
              <Badge variant="secondary" className="text-xs bg-[#10B981]/10 text-[#10B981]">
                Connected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Connect your Google Search Console to import organic traffic data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile.gscConnected ? (
            <Button onClick={handleConnectGsc}>
              <Globe className="h-4 w-4 mr-2" />
              Connect GSC
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="gsc-property">Property URL</Label>
                <Input
                  id="gsc-property"
                  value={profile.gscPropertyUrl}
                  onChange={(e) => updateProfile({ gscPropertyUrl: e.target.value })}
                  placeholder="https://yoursite.com"
                />
              </div>
              <Button variant="outline" onClick={handleDisconnectGsc}>
                <Unplug className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Publishing Integration (CMS) */}
      <Card className="wonda-card relative">
        {!isEnterprise && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Enterprise plan required
            </div>
          </div>
        )}
        <CardHeader>
          <CardTitle>Publishing Integration</CardTitle>
          <CardDescription>
            Connect a CMS to publish articles directly from Wonda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {CMS_OPTIONS.map((option) => {
              const isSelected = cmsIntegration.type === option.type && cmsIntegration.enabled
              return (
                <button
                  key={option.type}
                  onClick={() => handleSelectCms(option.type)}
                  className={`text-left rounded-lg p-3 border transition-all text-center ${
                    isSelected
                      ? "border-[#0061FF] bg-[#0061FF]/5"
                      : "border-border bg-white hover:border-[#0061FF]/30"
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              )
            })}
          </div>

          {cmsIntegration.enabled && selectedCmsOption && (
            <div className="space-y-4 pt-4 border-t border-border">
              {selectedCmsOption.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`cms-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`cms-${field.key}`}
                    value={cmsIntegration.config[field.key] ?? ""}
                    onChange={(e) => handleCmsConfigChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
              <Button onClick={handleSaveCms} className="w-full">
                Save Integration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
