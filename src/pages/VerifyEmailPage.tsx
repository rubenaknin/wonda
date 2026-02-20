import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { auth } from "@/lib/firebase"

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const { firebaseUser, sendVerificationEmail } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!firebaseUser) {
      navigate("/login")
      return
    }

    if (firebaseUser.emailVerified) {
      navigate("/onboarding")
      return
    }

    // Poll for verification
    intervalRef.current = setInterval(async () => {
      await auth.currentUser?.reload()
      if (auth.currentUser?.emailVerified) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        navigate("/onboarding")
      }
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [firebaseUser, navigate])

  const handleResend = async () => {
    try {
      await sendVerificationEmail()
      toast.success("Verification email sent!")
    } catch {
      toast.error("Failed to send verification email")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-md p-8 text-center space-y-6">
        <img src="/wonda-logo.png" alt="Wonda" className="h-8 mx-auto" />

        <div className="mx-auto w-16 h-16 rounded-full bg-[#0061FF]/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-[#0061FF]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Verify your email</h2>
          <p className="text-sm text-muted-foreground">
            We've sent a verification email to{" "}
            <strong>{firebaseUser?.email}</strong>. Click the link to continue.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for verification...
        </div>

        <Button variant="outline" onClick={handleResend}>
          Resend Email
        </Button>
      </div>
    </div>
  )
}
