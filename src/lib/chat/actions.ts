import type { Article, CompanyProfile } from "@/types"
import type { ChatIntent, ActionResult } from "./types"
import { findArticle } from "./intents"
import { generateSlug } from "@/lib/slug"

interface ArticlesOps {
  articles: Article[]
  addArticle: (article: Article) => void
  updateArticle: (id: string, updates: Partial<Article>) => void
  getArticleById: (id: string) => Article | undefined
}

interface ProfileOps {
  profile: CompanyProfile
  updateProfile: (partial: Partial<CompanyProfile>) => void
}

/**
 * Execute an intent against articles/profile contexts.
 */
export function executeAction(
  intent: ChatIntent,
  articlesOps: ArticlesOps,
  profileOps: ProfileOps
): ActionResult {
  switch (intent.type) {
    case "generate_article":
      return handleGenerateArticle(intent, profileOps)
    case "trigger_generation":
      return handleTriggerGeneration(intent, articlesOps)
    case "edit_article_field":
      return handleEditArticleField(intent, articlesOps)
    case "edit_default":
      return handleEditDefault(intent, profileOps)
    case "query_articles":
      return handleQueryArticles(intent, articlesOps)
    case "count_articles":
      return handleCountArticles(intent, articlesOps)
    case "preview_article":
      return handlePreviewArticle(intent, articlesOps)
    case "help":
      return { success: true, message: "help" }
    case "unknown":
    default:
      return { success: true, message: "unknown" }
  }
}

// ============================================================
// Handlers
// ============================================================

function handleGenerateArticle(
  intent: ChatIntent,
  profileOps: ProfileOps
): ActionResult {
  const keyword = intent.articleRef ?? ""
  const title = keyword
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
  const slug = generateSlug(keyword)
  const category = intent.category ?? "blog"
  const contentPath =
    profileOps.profile.contentPaths.length > 0
      ? profileOps.profile.contentPaths[0]
      : "/blog"

  return {
    success: true,
    message: "confirm_generate",
    data: {
      article: { title, keyword, slug, category, contentPath },
    },
  }
}

function handleTriggerGeneration(
  intent: ChatIntent,
  articlesOps: ArticlesOps
): ActionResult {
  if (!intent.articleRef) {
    return { success: false, message: "Which article should I generate content for?" }
  }

  const article = findArticle(intent.articleRef, articlesOps.articles)
  if (!article) {
    return {
      success: false,
      message: `I couldn't find an article matching "${intent.articleRef}".`,
    }
  }

  return {
    success: true,
    message: `Starting content generation for "${article.title}"...`,
    data: { articleId: article.id, article },
  }
}

function handleEditArticleField(
  intent: ChatIntent,
  articlesOps: ArticlesOps
): ActionResult {
  if (!intent.articleRef) {
    return { success: false, message: "I need to know which article to edit." }
  }

  const article = findArticle(intent.articleRef, articlesOps.articles)
  if (!article) {
    return {
      success: false,
      message: `I couldn't find an article matching "${intent.articleRef}".`,
    }
  }

  if (!intent.field || !intent.value) {
    return {
      success: false,
      message: "I need both a field and a value to update.",
    }
  }

  articlesOps.updateArticle(article.id, {
    [intent.field]: intent.value,
  })

  return {
    success: true,
    message: `Updated **${intent.field}** of "${article.title}" to "${intent.value}".`,
    data: { articleId: article.id },
  }
}

function handleEditDefault(
  intent: ChatIntent,
  profileOps: ProfileOps
): ActionResult {
  if (!intent.field || intent.field === "unknown") {
    return {
      success: false,
      message: "I'm not sure which default setting you want to change.",
    }
  }

  const value = intent.value ?? ""

  if (intent.field === "contentPaths") {
    const paths = value
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
    profileOps.updateProfile({ contentPaths: paths })
    return {
      success: true,
      message: `Default content path updated to **${paths.join(", ")}**. All future articles will use this path.`,
    }
  }

  if (intent.field === "category") {
    return {
      success: true,
      message: `Noted! I'll suggest **${value}** as the default category for new articles.`,
    }
  }

  profileOps.updateProfile({ [intent.field]: value })
  return {
    success: true,
    message: `Default **${intent.field}** updated to "${value}".`,
  }
}

function applyDateFilter(articles: Article[], intent: ChatIntent): Article[] {
  let filtered = articles
  const now = Date.now()

  if (intent.olderThanDays) {
    const cutoff = now - intent.olderThanDays * 24 * 60 * 60 * 1000
    filtered = filtered.filter((a) => new Date(a.createdAt).getTime() < cutoff)
  }

  if (intent.newerThanDays) {
    const cutoff = now - intent.newerThanDays * 24 * 60 * 60 * 1000
    filtered = filtered.filter((a) => new Date(a.createdAt).getTime() >= cutoff)
  }

  return filtered
}

function handleQueryArticles(
  intent: ChatIntent,
  articlesOps: ArticlesOps
): ActionResult {
  let filtered = articlesOps.articles
  if (intent.statusFilter) {
    filtered = filtered.filter((a) => a.status === intent.statusFilter)
  }
  filtered = applyDateFilter(filtered, intent)

  if (filtered.length === 0) {
    const qualifiers: string[] = []
    if (intent.statusFilter) qualifiers.push(`status "${intent.statusFilter}"`)
    if (intent.olderThanDays) qualifiers.push(`older than ${intent.olderThanDays} days`)
    if (intent.newerThanDays) qualifiers.push(`from the last ${intent.newerThanDays} days`)
    const qualifier = qualifiers.length > 0 ? ` (${qualifiers.join(", ")})` : ""
    return {
      success: true,
      message: `No articles found${qualifier}.`,
      data: { articles: [], count: 0 },
    }
  }

  return {
    success: true,
    message: "query_results",
    data: { articles: filtered, count: filtered.length },
  }
}

function handleCountArticles(
  intent: ChatIntent,
  articlesOps: ArticlesOps
): ActionResult {
  let filtered = articlesOps.articles
  if (intent.statusFilter) {
    filtered = filtered.filter((a) => a.status === intent.statusFilter)
  }
  filtered = applyDateFilter(filtered, intent)

  const qualifiers: string[] = []
  if (intent.statusFilter) qualifiers.push(intent.statusFilter)
  if (intent.olderThanDays) qualifiers.push(`older than ${intent.olderThanDays} days`)
  if (intent.newerThanDays) qualifiers.push(`from the last ${intent.newerThanDays} days`)
  const qualifier = qualifiers.length > 0 ? ` ${qualifiers.join(", ")}` : ""

  return {
    success: true,
    message: `You have **${filtered.length}**${qualifier} article${filtered.length !== 1 ? "s" : ""}.`,
    data: { count: filtered.length },
  }
}

function handlePreviewArticle(
  intent: ChatIntent,
  articlesOps: ArticlesOps
): ActionResult {
  if (!intent.articleRef) {
    return { success: false, message: "Which article would you like to preview?" }
  }

  const article = findArticle(intent.articleRef, articlesOps.articles)
  if (!article) {
    return {
      success: false,
      message: `I couldn't find an article matching "${intent.articleRef}".`,
    }
  }

  return {
    success: true,
    message: `Opening preview for "${article.title}"...`,
    data: { articleId: article.id, article },
  }
}
