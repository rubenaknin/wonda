import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Check, Lock, Globe, Unplug, Loader2, Building2, ArrowRight, AlertTriangle } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { usePlan } from "@/context/PlanContext"
import { useAuth } from "@/context/AuthContext"
import { PLAN_DETAILS, ROUTES } from "@/lib/constants"
import { createCheckoutSession } from "@/lib/stripe-client"
import { readCmsIntegration, writeCmsIntegration, writeGscData } from "@/lib/firestore"
import type { PricingTier, CmsType, CmsIntegration, GscData } from "@/types"

const CMS_OPTIONS: { type: CmsType; label: string; enterpriseOnly?: boolean; fields: { key: string; label: string; placeholder: string }[] }[] = [
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
    enterpriseOnly: true,
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
  const navigate = useNavigate()
  const { profile, updateProfile, profileCompletion } = useCompanyProfile()
  const { plan, selectPlan, isTrialActive, trialDaysRemaining } = usePlan()
  const { user, firebaseUser, deleteAccount } = useAuth()
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  // CMS state — loaded from Firestore
  const [cmsIntegration, setCmsIntegration] = useState<CmsIntegration>({
    type: "framer",
    enabled: false,
    config: {},
  })

  useEffect(() => {
    if (!user?.uid) return
    readCmsIntegration(user.uid).then((data) => {
      if (data) setCmsIntegration(data)
    }).catch(() => {})
  }, [user?.uid])

  const handleSelectPlan = async (tier: PricingTier) => {
    if (tier === "enterprise") {
      toast.info("Contact sales for Enterprise pricing")
      return
    }
    // If user is on trial or wants to upgrade, redirect to Stripe
    if (user && (user.planTier === "trial" || tier !== plan.tier)) {
      try {
        setUpgradeLoading(tier)
        await createCheckoutSession(user.uid, tier, user.email)
      } catch {
        // Fallback to local plan switch for demo
        selectPlan(tier)
        toast.success(`Switched to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan`)
      } finally {
        setUpgradeLoading(null)
      }
      return
    }
    selectPlan(tier)
    toast.success(`Switched to ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan`)
  }

  // GSC handlers
  const handleConnectGsc = () => {
    updateProfile({ gscConnected: true, gscPropertyUrl: profile.websiteUrl || "https://example.com" })
    if (user?.uid) {
      writeGscData(user.uid, DEFAULT_GSC_DATA).catch(() => {})
    }
    toast.success("Google Search Console connected")
  }

  const handleDisconnectGsc = () => {
    updateProfile({ gscConnected: false, gscPropertyUrl: "" })
    toast.success("Google Search Console disconnected")
  }

  // CMS handlers
  const isEnterprise = plan.tier === "enterprise"

  const handleSelectCms = (type: CmsType) => {
    const option = CMS_OPTIONS.find((o) => o.type === type)
    if (option?.enterpriseOnly && !isEnterprise) return
    setCmsIntegration((prev) => ({ ...prev, type, enabled: true }))
  }

  const handleCmsConfigChange = (key: string, value: string) => {
    setCmsIntegration((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }))
  }

  const handleSaveCms = () => {
    if (user?.uid) {
      writeCmsIntegration(user.uid, cmsIntegration).catch(() => {})
    }
    toast.success("Publishing integration saved")
  }

  const isEmailUser = firebaseUser?.providerData.some((p) => p.providerId === "password") ?? false

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true)
      await deleteAccount(isEmailUser ? deletePassword : undefined)
      // Hard reload to guarantee all React state and localStorage are wiped
      window.location.href = ROUTES.LOGIN
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete account"
      toast.error(msg)
      setDeleteLoading(false)
    }
  }

  const selectedCmsOption = CMS_OPTIONS.find((o) => o.type === cmsIntegration.type)

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your Wonda workspace.
        </p>
      </div>

      {/* Trial Banner */}
      {isTrialActive && (
        <div className="rounded-lg p-4 border border-[#0061FF]/20 bg-[#0061FF]/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] text-xs">Trial</Badge>
                <span className="text-sm font-medium">
                  {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upgrade to continue generating content after your trial ends.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Company Profile */}
      <Card
        className="wonda-card cursor-pointer hover:border-[#0061FF]/30 transition-colors"
        onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0061FF]/5">
              <Building2 className="h-4 w-4 text-[#0061FF]" />
            </div>
            <div>
              <p className="text-sm font-medium">Company Profile</p>
              <p className="text-xs text-muted-foreground">
                {profileCompletion === 100
                  ? "Your company profile is complete"
                  : `${profileCompletion}% complete`}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>

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
                  disabled={!!upgradeLoading}
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
                    {upgradeLoading === p.tier && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#0061FF]" />
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
      <Card className="wonda-card">
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
              const isLocked = option.enterpriseOnly && !isEnterprise
              return (
                <button
                  key={option.type}
                  onClick={() => handleSelectCms(option.type)}
                  disabled={isLocked}
                  className={`relative text-left rounded-lg p-3 border transition-all text-center ${
                    isLocked
                      ? "border-border bg-gray-50 opacity-60 cursor-not-allowed"
                      : isSelected
                        ? "border-[#0061FF] bg-[#0061FF]/5"
                        : "border-border bg-white hover:border-[#0061FF]/30"
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  {isLocked && (
                    <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-foreground" />
                  )}
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

      {/* Danger Zone */}
      <Card className="wonda-card border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, company profile, all articles, and settings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {isEmailUser && (
            <div className="space-y-2">
              <Label htmlFor="delete-password">Confirm your password</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading || (isEmailUser && !deletePassword)}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
