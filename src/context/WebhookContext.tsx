import { createContext, useContext, useCallback, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"
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

export function WebhookProvider({ children }: { children: ReactNode }) {
  const [webhookUrls, setWebhookUrls] = useLocalStorage<WebhookUrls>(
    STORAGE_KEYS.WEBHOOK_URLS,
    emptyUrls
  )

  const updateWebhookUrl = useCallback(
    (key: keyof WebhookUrls, url: string) => {
      setWebhookUrls((prev) => ({ ...prev, [key]: url }))
    },
    [setWebhookUrls]
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
