import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore"
import { db } from "./firebase"
import { STORAGE_KEYS } from "./constants"
import { writeCompanyProfile, writeWebhookSettings } from "./firestore"
import type { CompanyProfile, Article, WebhookUrls } from "@/types"

/**
 * Migrate localStorage data to Firestore on first login.
 * Only runs once per user (checks migratedFromLocalStorage flag).
 */
export async function migrateLocalStorageToFirestore(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid)
  const snap = await getDoc(userRef)
  const data = snap.data()

  if (data?.migratedFromLocalStorage) return

  // Migrate company profile
  try {
    const profileRaw = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE)
    if (profileRaw) {
      const profile: CompanyProfile = JSON.parse(profileRaw)
      await writeCompanyProfile(uid, profile)
    }
  } catch {
    // Ignore parse errors
  }

  // Migrate webhook URLs
  try {
    const webhookRaw = localStorage.getItem(STORAGE_KEYS.WEBHOOK_URLS)
    if (webhookRaw) {
      const urls: WebhookUrls = JSON.parse(webhookRaw)
      await writeWebhookSettings(uid, urls)
    }
  } catch {
    // Ignore parse errors
  }

  // Migrate articles
  try {
    const articlesRaw = localStorage.getItem(STORAGE_KEYS.ARTICLES)
    if (articlesRaw) {
      const articles: Article[] = JSON.parse(articlesRaw)
      const colRef = collection(db, "users", uid, "articles")
      for (const article of articles) {
        await addDoc(colRef, article)
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Set migration flag
  await setDoc(userRef, { migratedFromLocalStorage: true }, { merge: true })
}
