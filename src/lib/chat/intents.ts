import type { Article, CompanyProfile } from "@/types"
import type { ChatIntent } from "./types"

/**
 * Classify user message into a structured intent.
 * Priority-ordered pattern matching (regex + keywords).
 */
export function classifyIntent(
  message: string,
  articles: Article[],
  _profile: CompanyProfile
): ChatIntent {
  const msg = message.trim().toLowerCase()

  // --- help ---
  if (/\b(help|what can you do|commands)\b/.test(msg)) {
    return { type: "help" }
  }

  // --- generate_article ---
  const genMatch = msg.match(
    /(?:generate|create|write|add)\s+(?:an?\s+)?article\s+(?:about|called|titled|named)\s+['"]?(.+?)['"]?\s*$/
  )
  if (genMatch) {
    const raw = genMatch[1].replace(/['"]+$/g, "").trim()
    return { type: "generate_article", articleRef: raw }
  }

  // --- edit_default (must check before edit_article_field) ---
  if (
    /\b(default|all future|always|from now on)\b/.test(msg) &&
    /\b(category|content\s?path|cta|author|section|publish)\b/.test(msg)
  ) {
    const field = extractDefaultField(msg)
    const value = extractTrailingValue(msg)
    return { type: "edit_default", field, value }
  }

  // --- edit_article_field ---
  const editMatch = msg.match(
    /(?:change|set|update|edit)\s+(?:the\s+)?(\w+)\s+(?:of|for|on)\s+['"]?(.+?)['"]?\s+to\s+['"]?(.+?)['"]?\s*$/
  )
  if (editMatch) {
    return {
      type: "edit_article_field",
      field: normalizeField(editMatch[1]),
      articleRef: editMatch[2].replace(/['"]+$/g, "").trim(),
      value: editMatch[3].replace(/['"]+$/g, "").trim(),
    }
  }

  // --- count_articles ---
  if (/\b(how many|count|total)\b.*\barticle/.test(msg)) {
    const statusFilter = extractStatusFilter(msg)
    return { type: "count_articles", statusFilter }
  }

  // --- query_articles ---
  if (/\b(show|list|display|find|get)\b.*\barticle/.test(msg)) {
    const statusFilter = extractStatusFilter(msg)
    return { type: "query_articles", statusFilter }
  }

  // --- preview_article ---
  const previewMatch = msg.match(
    /(?:preview|show|open|view)\s+(?:article\s+)?['"]?(.+?)['"]?\s*$/
  )
  if (previewMatch && !previewMatch[1].includes("article")) {
    const ref = previewMatch[1].replace(/['"]+$/g, "").trim()
    // Only treat as preview if an article with this name exists
    const found = findArticle(ref, articles)
    if (found) {
      return { type: "preview_article", articleRef: ref }
    }
  }

  return { type: "unknown" }
}

// ============================================================
// Helpers
// ============================================================

function extractStatusFilter(msg: string) {
  if (/\bdraft\b/.test(msg)) return "draft" as const
  if (/\bpending\b/.test(msg)) return "pending" as const
  if (/\bpublished\b/.test(msg)) return "published" as const
  if (/\bgenerating\b/.test(msg)) return "generating" as const
  if (/\berror\b/.test(msg)) return "error" as const
  return undefined
}

function extractDefaultField(msg: string): string {
  if (/\bcategory\b/.test(msg)) return "category"
  if (/\b(content\s?path|section|publish)\b/.test(msg)) return "contentPaths"
  if (/\bcta\b/.test(msg)) return "ctaText"
  if (/\bauthor\b/.test(msg)) return "authorAssignmentRules"
  return "unknown"
}

function extractTrailingValue(msg: string): string {
  // Try to grab value after "to" or after the last preposition
  const toMatch = msg.match(/\bto\s+['"]?(.+?)['"]?\s*$/)
  if (toMatch) return toMatch[1].trim()
  // Try value in quotes
  const quoteMatch = msg.match(/['"]([^'"]+)['"]/)
  if (quoteMatch) return quoteMatch[1].trim()
  // Try after "in"
  const inMatch = msg.match(/\bin\s+['"]?(\S+)['"]?\s*$/)
  if (inMatch) return inMatch[1].trim()
  return ""
}

function normalizeField(raw: string): string {
  const map: Record<string, string> = {
    keyword: "keyword",
    keywords: "keyword",
    title: "title",
    slug: "slug",
    category: "category",
    status: "status",
    meta: "metaTitle",
    metatitle: "metaTitle",
    metadescription: "metaDescription",
    cta: "ctaText",
    author: "authorId",
  }
  return map[raw.toLowerCase()] ?? raw.toLowerCase()
}

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
