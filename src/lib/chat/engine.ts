import type { Article, CompanyProfile } from "@/types"
import type { ChatMessage, PendingConfirmation } from "./types"
import { classifyIntent } from "./intents"
import { executeAction } from "./actions"
import { buildResponse } from "./responses"

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

interface ProcessResult {
  response: ChatMessage
  pendingConfirmation?: PendingConfirmation
  command?: { type: string; payload: Record<string, string> }
}

let msgCounter = 0

function createMessageId(): string {
  msgCounter += 1
  return `msg_${Date.now()}_${msgCounter}`
}

/**
 * Main pipeline: message → AI classify → execute → respond
 */
export async function processMessage(
  userText: string,
  articlesOps: ArticlesOps,
  profileOps: ProfileOps,
  history: ChatMessage[]
): Promise<ProcessResult> {
  const intentResult = await classifyIntent(userText, articlesOps.articles, history)
  const { fallbackText, ...intent } = intentResult

  const result = executeAction(intent, articlesOps, profileOps)

  // If AI returned a custom fallback message for unknown intents, use it
  if (intent.type === "unknown" && fallbackText) {
    const response: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      text: fallbackText,
      timestamp: Date.now(),
    }
    return { response }
  }

  const partial = buildResponse(intent, result)

  const response: ChatMessage = {
    ...partial,
    id: createMessageId(),
    timestamp: Date.now(),
  }

  // Build pending confirmation for generate flow
  let pendingConfirmation: PendingConfirmation | undefined
  if (intent.type === "generate_article" && result.success && result.data?.article) {
    const a = result.data.article
    pendingConfirmation = {
      type: "generate_article",
      data: {
        title: a.title ?? "",
        keyword: a.keyword ?? "",
        slug: a.slug ?? "",
        category: a.category ?? "blog",
        contentPath: a.contentPath,
      },
    }
  }

  // Build command for preview
  let command: ProcessResult["command"]
  if (intent.type === "preview_article" && result.data?.articleId) {
    command = {
      type: "open_article_preview",
      payload: { articleId: result.data.articleId },
    }
  }

  return { response, pendingConfirmation, command }
}

/**
 * Handle confirmation of a pending generate article flow.
 * Creates the article and returns a success message.
 */
export function confirmGeneration(
  pending: PendingConfirmation,
  articlesOps: ArticlesOps
): ProcessResult {
  const { title, keyword, slug, category, contentPath } = pending.data
  const now = new Date().toISOString()
  const id = `art_${Date.now()}`

  const newArticle: Article = {
    id,
    title,
    keyword,
    slug,
    category,
    status: "pending",
    bodyHtml: "",
    faqHtml: "",
    faqItems: [],
    metaTitle: "",
    metaDescription: "",
    ctaText: "",
    ctaUrl: "",
    internalLinks: [],
    selectedQuestions: [],
    createdAt: now,
    updatedAt: now,
    source: "new",
    origin: "wonda",
    contentPath,
  }

  articlesOps.addArticle(newArticle)

  const response: ChatMessage = {
    id: createMessageId(),
    role: "assistant",
    text: `Done! **${title}** has been added to your Content Library.`,
    timestamp: Date.now(),
    buttons: [
      { label: "Preview", action: "preview", payload: { articleId: id } },
      { label: "Edit", action: "edit", payload: { articleId: id } },
      { label: "Generate Content", action: "generate_content", payload: { articleId: id } },
    ],
  }

  return {
    response,
    command: {
      type: "navigate",
      payload: { path: "/content-library" },
    },
  }
}

/**
 * Handle action button clicks from chat messages.
 */
export function handleActionButton(
  action: string,
  payload: Record<string, string> | undefined
): ProcessResult["command"] | undefined {
  switch (action) {
    case "preview":
      if (payload?.articleId) {
        return { type: "open_article_preview", payload: { articleId: payload.articleId } }
      }
      break
    case "edit":
      if (payload?.articleId) {
        return { type: "open_article_wizard", payload: { articleId: payload.articleId } }
      }
      break
    case "generate_content":
      if (payload?.articleId) {
        return {
          type: "open_article_wizard",
          payload: { articleId: payload.articleId, startStep: "generate" },
        }
      }
      break
    case "navigate":
      if (payload?.path) {
        return { type: "navigate", payload: { path: payload.path } }
      }
      break
  }
  return undefined
}
