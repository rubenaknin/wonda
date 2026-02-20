import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { readUserDoc, readUserCompanyProfile, readUserArticlesAdmin } from "@/lib/firestore"
import type { UserProfile, CompanyProfile, Article } from "@/types"

export function AdminUserViewPage() {
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return

    Promise.all([
      readUserDoc(uid),
      readUserCompanyProfile(uid),
      readUserArticlesAdmin(uid),
    ])
      .then(([user, company, arts]) => {
        setUserProfile(user)
        setCompanyProfile(company)
        setArticles(arts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uid])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0061FF]" />
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>
        <p className="text-muted-foreground">User not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Admin
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{userProfile.email}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {userProfile.domain} &middot; Joined{" "}
          {new Date(userProfile.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* User Info */}
      <Card className="wonda-card">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Plan</span>
              <p className="font-medium capitalize">{userProfile.planTier}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Role</span>
              <p className="font-medium capitalize">{userProfile.role}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Articles Used</span>
              <p className="font-medium">{userProfile.articlesUsed}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Onboarded</span>
              <p className="font-medium">
                {userProfile.onboardingComplete ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Profile */}
      {companyProfile && (
        <Card className="wonda-card">
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Company Name</span>
                <p className="font-medium">{companyProfile.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Website</span>
                <p className="font-medium">{companyProfile.websiteUrl || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Description</span>
                <p>{companyProfile.description || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Value Prop</span>
                <p>{companyProfile.valueProp || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Articles */}
      <Card className="wonda-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Articles
            <Badge variant="secondary">{articles.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Keyword</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-3">{a.title || a.slug || "Untitled"}</td>
                      <td className="py-3 text-muted-foreground">{a.keyword}</td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {a.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground capitalize">
                        {a.category.replace("-", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No articles yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
