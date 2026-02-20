import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, firebaseUser, loading, initialized } = useAuth()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0061FF]" />
      </div>
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />
  }

  if (!firebaseUser.emailVerified) {
    return <Navigate to="/verify-email" replace />
  }

  if (!user?.onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
