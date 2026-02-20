import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"
import { readWebhookSettings, writeWebhookSettings } from "@/lib/firestore"
import type { WebhookUrls } from "@/types"

const emptyUrls: WebhookUrls = {
  generateSlug: "",
  generateLinks: "",
  generateArticle: "",
  generateCta: "",
  analyzeKeywords: "",
  researchKeywords: "",
}

interface WebhookContextValue {
  webhookUrls: WebhookUrls
  setWebhookUrls: (urls: WebhookUrls) => void
  updateWebhookUrl: (key: keyof WebhookUrls, url: string) => void
  hasAnyWebhook: boolean
}

const WebhookContext = createContext<WebhookContextValue | null>(null)

export function WebhookProvider({ children, uid }: { children: ReactNode; uid?: string }) {
  const [webhookUrls, setWebhookUrls] = useLocalStorage<WebhookUrls>(
    STORAGE_KEYS.WEBHOOK_URLS,
    emptyUrls
  )
  const [firestoreLoaded, setFirestoreLoaded] = useState(false)

  useEffect(() => {
    if (!uid || firestoreLoaded) return
    readWebhookSettings(uid)
      .then((data) => {
        if (data) {
          setWebhookUrls(data)
        }
      })
      .catch(() => {})
      .finally(() => setFirestoreLoaded(true))
  }, [uid, firestoreLoaded, setWebhookUrls])

  const updateWebhookUrl = useCallback(
    (key: keyof WebhookUrls, url: string) => {
      setWebhookUrls((prev) => {
        const updated = { ...prev, [key]: url }
        if (uid) {
          writeWebhookSettings(uid, updated).catch(() => {})
        }
        return updated
      })
    },
    [setWebhookUrls, uid]
  )

  const setWebhookUrlsWithSync = useCallback(
    (urls: WebhookUrls) => {
      setWebhookUrls(urls)
      if (uid) {
        writeWebhookSettings(uid, urls).catch(() => {})
      }
    },
    [setWebhookUrls, uid]
  )

  const hasAnyWebhook = Object.values(webhookUrls).some((u) => u.trim() !== "")

  return (
    <WebhookContext.Provider
      value={{ webhookUrls, setWebhookUrls: setWebhookUrlsWithSync, updateWebhookUrl, hasAnyWebhook }}
    >
      {children}
    </WebhookContext.Provider>
  )
}

export function useWebhook() {
  const context = useContext(WebhookContext)
  if (!context) {
    throw new Error("useWebhook must be used within a WebhookProvider")
  }
  return context
}
