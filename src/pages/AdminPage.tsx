import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Users, CreditCard, Clock } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { readAllUsers } from "@/lib/firestore"
import type { UserProfile } from "@/types"

export function AdminPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    readAllUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalUsers = users.length
  const activeTrials = users.filter((u) => u.planTier === "trial").length
  const paidSubscribers = users.filter(
    (u) => u.planTier !== "trial" && u.stripeSubscriptionId
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0061FF]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all Wonda users and their activity.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="wonda-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card className="wonda-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTrials}</div>
          </CardContent>
        </Card>
        <Card className="wonda-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid Subscribers</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidSubscribers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="wonda-card">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Domain</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Articles</th>
                  <th className="pb-3 font-medium">Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.uid}
                    className="border-b border-border last:border-0 hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/user/${u.uid}`)}
                  >
                    <td className="py-3">{u.email}</td>
                    <td className="py-3 text-muted-foreground">{u.domain}</td>
                    <td className="py-3">
                      <span className="capitalize">{u.planTier}</span>
                    </td>
                    <td className="py-3">{u.articlesUsed}</td>
                    <td className="py-3 text-muted-foreground">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No users found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
