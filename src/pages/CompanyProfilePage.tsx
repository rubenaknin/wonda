import { useState } from "react"
import { toast } from "sonner"
import { Sparkles, Loader2, Building2, Target, Users, Brain, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { BrandDnaStep } from "@/components/company-profile/BrandDnaStep"
import { GoalStep } from "@/components/company-profile/GoalStep"
import { CompetitorsStep } from "@/components/company-profile/CompetitorsStep"
import { IntelligenceBankStep } from "@/components/company-profile/IntelligenceBankStep"
import { AuthorsStep } from "@/components/company-profile/AuthorsStep"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { aiFillAll } from "@/lib/ai-fill"

const TABS = [
  { id: "brand", label: "Brand DNA", icon: Building2, description: "Company identity & value proposition" },
  { id: "goal", label: "The Goal", icon: Target, description: "CTA & conversion targets" },
  { id: "competitors", label: "Competitors", icon: Users, description: "Competitive landscape" },
  { id: "intelligence", label: "Intelligence Bank", icon: Brain, description: "Audience questions & insights" },
  { id: "authors", label: "Authors", icon: PenTool, description: "Content creators & assignment rules" },
]

export function CompanyProfilePage() {
  const { profile, updateProfile } = useCompanyProfile()
  const [aiLoading, setAiLoading] = useState(false)

  const handleAiFillAll = async () => {
    setAiLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    const updates = aiFillAll(profile)
    updateProfile(updates)
    setAiLoading(false)
    toast.success("AI filled all empty fields")
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Define your company intelligence to power AI-generated content.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAiFillAll}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          AI Fill All
        </Button>
      </div>

      <Tabs defaultValue="brand" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-[#F8FAFC] rounded-lg flex-wrap gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-4 rounded-lg border border-border bg-white p-6">
          <TabsContent value="brand" className="mt-0">
            <BrandDnaStep profile={profile} onUpdate={updateProfile} />
          </TabsContent>

          <TabsContent value="goal" className="mt-0">
            <GoalStep profile={profile} onUpdate={updateProfile} />
          </TabsContent>

          <TabsContent value="competitors" className="mt-0">
            <CompetitorsStep profile={profile} onUpdate={updateProfile} />
          </TabsContent>

          <TabsContent value="intelligence" className="mt-0">
            <IntelligenceBankStep profile={profile} onUpdate={updateProfile} />
          </TabsContent>

          <TabsContent value="authors" className="mt-0">
            <AuthorsStep profile={profile} onUpdate={updateProfile} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
