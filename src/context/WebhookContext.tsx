import { createContext, useContext, useCallback, useEffect, useState, useRef, type ReactNode } from "react"
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

function writeCache(urls: WebhookUrls) {
  try { localStorage.setItem(STORAGE_KEYS.WEBHOOK_URLS, JSON.stringify(urls)) } catch {}
}

interface WebhookContextValue {
  webhookUrls: WebhookUrls
  setWebhookUrls: (urls: WebhookUrls) => void
  updateWebhookUrl: (key: keyof WebhookUrls, url: string) => void
  hasAnyWebhook: boolean
}

const WebhookContext = createContext<WebhookContextValue | null>(null)

export function WebhookProvider({ children, uid }: { children: ReactNode; uid?: string }) {
  const [webhookUrls, setWebhookUrlsState] = useState<WebhookUrls>(emptyUrls)
  const prevUidRef = useRef<string | undefined>(undefined)

  // When uid changes: reset state, then load from Firestore
  useEffect(() => {
    if (prevUidRef.current === uid) return
    prevUidRef.current = uid

    if (!uid) {
      setWebhookUrlsState(emptyUrls)
      writeCache(emptyUrls)
      return
    }

    readWebhookSettings(uid)
      .then((data) => {
        if (data) {
          setWebhookUrlsState(data)
          writeCache(data)
        } else {
          setWebhookUrlsState(emptyUrls)
          writeCache(emptyUrls)
        }
      })
      .catch(() => {
        setWebhookUrlsState(emptyUrls)
        writeCache(emptyUrls)
      })
  }, [uid])

  const updateWebhookUrl = useCallback(
    (key: keyof WebhookUrls, url: string) => {
      setWebhookUrlsState((prev) => {
        const updated = { ...prev, [key]: url }
        writeCache(updated)
        if (uid) {
          writeWebhookSettings(uid, updated).catch(() => {})
        }
        return updated
      })
    },
    [uid]
  )

  const setWebhookUrls = useCallback(
    (urls: WebhookUrls) => {
      setWebhookUrlsState(urls)
      writeCache(urls)
      if (uid) {
        writeWebhookSettings(uid, urls).catch(() => {})
      }
    },
    [uid]
  )

  const hasAnyWebhook = Object.values(webhookUrls).some((u) => u.trim() !== "")

  return (
    <WebhookContext.Provider
      value={{ webhookUrls, setWebhookUrls, updateWebhookUrl, hasAnyWebhook }}
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
