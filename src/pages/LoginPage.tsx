import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, AlertTriangle, TrendingUp, FileText, RefreshCw, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/AuthContext"
import { isPersonalEmail } from "@/lib/auth-helpers"

// Animated stats for the preview panel
function AnimatedPreview() {
  const [trafficValue, setTrafficValue] = useState(0)
  const [articlesGenerated, setArticlesGenerated] = useState(0)
  const [articlesRefreshed, setArticlesRefreshed] = useState(0)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 400)
    const t2 = setTimeout(() => setStep(2), 1200)
    const t3 = setTimeout(() => setStep(3), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (step < 1) return
    const target = 12450
    const duration = 1500
    const start = Date.now()
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setTrafficValue(Math.floor(target * easeOut(progress)))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [step])

  useEffect(() => {
    if (step < 2) return
    const target = 47
    const duration = 1200
    const start = Date.now()
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setArticlesGenerated(Math.floor(target * easeOut(progress)))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [step])

  useEffect(() => {
    if (step < 3) return
    const target = 23
    const duration = 1000
    const start = Date.now()
    const frame = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setArticlesRefreshed(Math.floor(target * easeOut(progress)))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [step])

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 space-y-8">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0061FF]/10 text-[#0061FF] text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          Powered by AI
        </div>
        <h2 className="text-2xl font-bold text-white">
          Grow your organic traffic
        </h2>
        <p className="text-sm text-white/60 max-w-xs">
          See the impact Wonda can have on your content engine
        </p>
      </div>

      {/* Traffic chart mockup */}
      <div className="w-full max-w-xs space-y-6">
        {/* Traffic stat */}
        <div className={`bg-white/10 backdrop-blur rounded-xl p-5 transition-all duration-500 ${step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <TrendingUp className="h-4 w-4 text-[#10B981]" />
            </div>
            <span className="text-xs text-white/70">Non-Branded Traffic</span>
          </div>
          <p className="text-3xl font-bold text-white">{trafficValue.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-[#10B981] font-medium">+127%</span>
            <span className="text-xs text-white/50">vs last quarter</span>
          </div>
          {/* Mini chart bars */}
          <div className="flex items-end gap-1 mt-4 h-10">
            {[20, 28, 35, 30, 42, 55, 48, 62, 70, 85, 78, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-[#10B981]/40 transition-all duration-700"
                style={{
                  height: step >= 1 ? `${h}%` : "0%",
                  transitionDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Articles generated */}
        <div className={`bg-white/10 backdrop-blur rounded-xl p-5 transition-all duration-500 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#0061FF]/20">
              <FileText className="h-4 w-4 text-[#0061FF]" />
            </div>
            <span className="text-xs text-white/70">Articles Generated</span>
          </div>
          <p className="text-3xl font-bold text-white">{articlesGenerated}</p>
          <p className="text-xs text-white/50 mt-1">SEO-optimized & published</p>
        </div>

        {/* Articles refreshed */}
        <div className={`bg-white/10 backdrop-blur rounded-xl p-5 transition-all duration-500 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <RefreshCw className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <span className="text-xs text-white/70">Articles Refreshed</span>
          </div>
          <p className="text-3xl font-bold text-white">{articlesRefreshed}</p>
          <p className="text-xs text-white/50 mt-1">Updated for better rankings</p>
        </div>
      </div>
    </div>
  )
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function LoginPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showVerifyMessage, setShowVerifyMessage] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
      navigate("/onboarding")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google sign-in failed"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    try {
      setLoading(true)
      await signUpWithEmail(email, password)
      setShowVerifyMessage(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await signInWithEmail(email, password)
      navigate("/")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (showVerifyMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-full max-w-md p-8 text-center space-y-4">
          <img src="/wonda-logo.png" alt="Wonda" className="h-8 mx-auto mb-6" />
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We've sent a verification email to <strong>{email}</strong>. Click
            the link in the email to verify your account, then come back here.
          </p>
          <Button variant="outline" onClick={() => navigate("/verify-email")}>
            I've verified my email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex">
        {/* Left: Sign in/up form */}
        <div className="w-full md:w-1/2 p-8 md:p-10 space-y-6">
          <div>
            <img src="/wonda-logo.png" alt="Wonda" className="h-8 mb-6" />
            <h1 className="text-2xl font-bold">Welcome to Wonda</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered content generation for your business
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                Continue with Google
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                  {email && isPersonalEmail(email) && (
                    <div className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
                      <AlertTriangle className="h-3 w-3" />
                      We recommend using your work email for the best experience
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                Continue with Google
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Animated preview (hidden on mobile) */}
        <div className="hidden md:block w-1/2 bg-gradient-to-br from-[#0a0a23] to-[#1a1a4e] relative overflow-hidden">
          <AnimatedPreview />
        </div>
      </div>
    </div>
  )
}
