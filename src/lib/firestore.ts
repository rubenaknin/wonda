import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import type { CompanyProfile, Article, WebhookUrls, UserProfile } from "@/types"

// ---- User Profile ----

export async function readUserDoc(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function writeUserDoc(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, "users", uid), data, { merge: true })
}

// ---- Company Profile ----

export async function readCompanyProfile(uid: string): Promise<CompanyProfile | null> {
  const snap = await getDoc(doc(db, "users", uid, "data", "companyProfile"))
  return snap.exists() ? (snap.data() as CompanyProfile) : null
}

export async function writeCompanyProfile(uid: string, profile: CompanyProfile): Promise<void> {
  await setDoc(doc(db, "users", uid, "data", "companyProfile"), profile)
}

// ---- Settings (Webhook URLs) ----

export async function readWebhookSettings(uid: string): Promise<WebhookUrls | null> {
  const snap = await getDoc(doc(db, "users", uid, "data", "settings"))
  return snap.exists() ? (snap.data() as WebhookUrls) : null
}

export async function writeWebhookSettings(uid: string, urls: WebhookUrls): Promise<void> {
  await setDoc(doc(db, "users", uid, "data", "settings"), urls)
}

// ---- Articles ----

export async function readUserArticles(uid: string): Promise<Article[]> {
  const colRef = collection(db, "users", uid, "articles")
  const snap = await getDocs(colRef)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Article))
}

export async function addUserArticle(uid: string, article: Article): Promise<string> {
  const colRef = collection(db, "users", uid, "articles")
  const docRef = await addDoc(colRef, article)
  return docRef.id
}

export async function updateUserArticle(
  uid: string,
  articleId: string,
  updates: Partial<Article>
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "articles", articleId), updates)
}

export async function deleteUserArticle(uid: string, articleId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "articles", articleId))
}

// ---- Account Deletion ----

export async function deleteAllUserData(uid: string): Promise<void> {
  // Delete all articles
  const articlesRef = collection(db, "users", uid, "articles")
  const articlesSnap = await getDocs(articlesRef)
  for (const articleDoc of articlesSnap.docs) {
    await deleteDoc(articleDoc.ref)
  }

  // Delete data subcollection docs
  await deleteDoc(doc(db, "users", uid, "data", "companyProfile")).catch(() => {})
  await deleteDoc(doc(db, "users", uid, "data", "settings")).catch(() => {})

  // Delete user doc
  await deleteDoc(doc(db, "users", uid))
}

// ---- Admin: Read all users ----

export async function readAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"))
  return snap.docs.map((d) => d.data() as UserProfile)
}

export async function readUserCompanyProfile(uid: string): Promise<CompanyProfile | null> {
  return readCompanyProfile(uid)
}

export async function readUserArticlesAdmin(uid: string): Promise<Article[]> {
  return readUserArticles(uid)
}
