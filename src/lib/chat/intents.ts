import type { Article, CompanyProfile } from "@/types"
import type { ChatIntent, ChatIntentType, ChatMessage } from "./types"

// ============================================================
// AI-powered intent classification via Vercel API route
// ============================================================

interface ClassifyResponse {
  intent: string
  params: Record<string, string | number>
  fallbackText?: string
}

/**
 * Classify user message using Claude AI (via /api/chat-classify).
 * Sends conversation history and company profile for full context.
 * Falls back to local regex if the API is unreachable.
 */
export async function classifyIntent(
  message: string,
  articles: Article[],
  history: ChatMessage[],
  profile: CompanyProfile
): Promise<ChatIntent & { fallbackText?: string }> {
  try {
    const articleTitles = articles
      .map((a) => a.title || a.keyword || a.slug)
      .filter(Boolean)

    const recentHistory = history.slice(-20).map((m) => ({
      role: m.role,
      text: m.text,
    }))

    // Compact profile summary for AI context
    const companyProfile = {
      name: profile.name,
      description: profile.description,
      valueProp: profile.valueProp,
      websiteUrl: profile.websiteUrl,
      competitors: profile.competitors.map((c) => c.name),
      contentPaths: profile.contentPaths,
    }

    const res = await fetch("/api/chat-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        articleTitles,
        history: recentHistory,
        companyProfile,
      }),
    })

    if (!res.ok) throw new Error(`API ${res.status}`)

    const data: ClassifyResponse = await res.json()
    return mapApiResponse(data)
  } catch {
    return classifyIntentLocal(message)
  }
}

function mapApiResponse(
  data: ClassifyResponse
): ChatIntent & { fallbackText?: string } {
  const intentType = VALID_INTENTS.has(data.intent as ChatIntentType)
    ? (data.intent as ChatIntentType)
    : "unknown"

  const p = data.params ?? {}

  return {
    type: intentType,
    articleRef: p.articleRef as string | undefined,
    field: p.field as string | undefined,
    value: p.value as string | undefined,
    statusFilter: p.statusFilter as ChatIntent["statusFilter"],
    category: p.category as ChatIntent["category"],
    olderThanDays: typeof p.olderThanDays === "number" ? p.olderThanDays : undefined,
    newerThanDays: typeof p.newerThanDays === "number" ? p.newerThanDays : undefined,
    fallbackText: data.fallbackText,
  }
}

const VALID_INTENTS = new Set<ChatIntentType>([
  "generate_article",
  "trigger_generation",
  "edit_article_field",
  "edit_default",
  "query_articles",
  "count_articles",
  "preview_article",
  "help",
  "unknown",
])

// ============================================================
// Local regex fallback (no network needed)
// ============================================================

function classifyIntentLocal(message: string): ChatIntent {
  const msg = message.trim().toLowerCase()

  if (/\b(help|what can you do|commands)\b/.test(msg)) {
    return { type: "help" }
  }

  const genMatch = msg.match(
    /(?:generate|create|write|add|make)\s+(?:a\s+new\s+|an?\s+)?article\s+(?:about|called|titled|named|on)\s+['"]?(.+?)['"]?\s*$/
  )
  if (genMatch) {
    return {
      type: "generate_article",
      articleRef: genMatch[1].replace(/['"]+$/g, "").trim(),
    }
  }

  if (
    /\b(default|all future|always|from now on)\b/.test(msg) &&
    /\b(category|content\s?path|cta|author|section|publish)\b/.test(msg)
  ) {
    return { type: "edit_default" }
  }

  const editMatch = msg.match(
    /(?:change|set|update|edit)\s+(?:the\s+)?(\w+)\s+(?:of|for|on)\s+['"]?(.+?)['"]?\s+to\s+['"]?(.+?)['"]?\s*$/
  )
  if (editMatch) {
    return {
      type: "edit_article_field",
      field: editMatch[1],
      articleRef: editMatch[2].replace(/['"]+$/g, "").trim(),
      value: editMatch[3].replace(/['"]+$/g, "").trim(),
    }
  }

  if (/\b(how many|count|total)\b.*\barticle/.test(msg)) {
    return { type: "count_articles" }
  }

  if (/\b(show|list|display|find|get)\b.*\barticle/.test(msg)) {
    return { type: "query_articles" }
  }

  return { type: "unknown" }
}

// ============================================================
// Article finder (used by actions.ts)
// ============================================================

export function findArticle(
  ref: string,
  articles: Article[]
): Article | undefined {
  const lower = ref.toLowerCase()
  return (
    articles.find((a) => a.title.toLowerCase() === lower) ??
    articles.find((a) => a.keyword.toLowerCase() === lower) ??
    articles.find((a) => a.slug.toLowerCase() === lower) ??
    articles.find(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.keyword.toLowerCase().includes(lower)
    )
  )
}
