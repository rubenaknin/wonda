import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { extractDomain, isAdminEmail, clearAllLocalData } from "@/lib/auth-helpers"
import { migrateLocalStorageToFirestore } from "@/lib/migration"
import { deleteAllUserData } from "@/lib/firestore"
import type { UserProfile } from "@/types"

interface AuthContextValue {
  user: UserProfile | null
  firebaseUser: User | null
  loading: boolean
  initialized: boolean
  signInWithGoogle: () => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: (password?: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const googleProvider = new GoogleAuthProvider()

function buildFallbackProfile(fbUser: User): UserProfile {
  const email = fbUser.email ?? ""
  return {
    uid: fbUser.uid,
    email,
    domain: extractDomain(email),
    displayName: fbUser.displayName ?? "",
    role: isAdminEmail(email) ? "admin" : "user",
    createdAt: new Date().toISOString(),
    trialStartDate: new Date().toISOString(),
    planTier: "trial",
    stripeCustomerId: "",
    stripeSubscriptionId: "",
    onboardingComplete: false,
    articlesUsed: 0,
  }
}

async function getOrCreateUserDoc(firebaseUser: User): Promise<UserProfile> {
  const userRef = doc(db, "users", firebaseUser.uid)
  const snap = await getDoc(userRef)

  if (snap.exists()) {
    return snap.data() as UserProfile
  }

  const newProfile = buildFallbackProfile(firebaseUser)
  await setDoc(userRef, newProfile)
  return newProfile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const profile = await getOrCreateUserDoc(fbUser)
          setUser(profile)
          migrateLocalStorageToFirestore(fbUser.uid).catch(() => {})
        } catch (err) {
          console.error("Firestore user doc failed, using fallback:", err)
          // Fallback: build profile from Firebase Auth data so app still works
          setUser(buildFallbackProfile(fbUser))
        }
      } else {
        setUser(null)
      }
      setLoading(false)
      setInitialized(true)
    })
    return unsub
  }, [])

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return
    try {
      const profile = await getOrCreateUserDoc(firebaseUser)
      setUser(profile)
    } catch {
      // Keep existing user state
    }
  }, [firebaseUser])

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    await signInWithPopup(auth, googleProvider)
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true)
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (cred.user) {
      await sendEmailVerification(cred.user)
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true)
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signOut = useCallback(async () => {
    clearAllLocalData()
    await firebaseSignOut(auth)
    setUser(null)
    setFirebaseUser(null)
  }, [])

  const deleteAccount = useCallback(async (password?: string) => {
    const fbUser = auth.currentUser
    if (!fbUser) throw new Error("Not signed in")

    // 1. Delete Firestore data while auth is still valid
    await deleteAllUserData(fbUser.uid)

    // 2. Clear localStorage
    clearAllLocalData()

    // 3. Delete Firebase Auth user
    try {
      await deleteUser(fbUser)
    } catch (err: unknown) {
      // Re-auth required
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "auth/requires-recent-login") {
        const providerIds = fbUser.providerData.map((p) => p.providerId)
        if (providerIds.includes("google.com")) {
          await reauthenticateWithPopup(fbUser, googleProvider)
        } else if (providerIds.includes("password") && password) {
          const credential = EmailAuthProvider.credential(fbUser.email!, password)
          await reauthenticateWithCredential(fbUser, credential)
        } else {
          throw new Error("Re-authentication required. Please provide your password.")
        }
        await deleteUser(fbUser)
      } else {
        throw err
      }
    }

    // 4. Clear local state
    setUser(null)
    setFirebaseUser(null)
  }, [])

  const sendVerificationEmailFn = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        initialized,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        signOut,
        deleteAccount,
        sendVerificationEmail: sendVerificationEmailFn,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
