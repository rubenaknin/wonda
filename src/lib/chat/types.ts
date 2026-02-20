import type { Article, ArticleCategory, ArticleStatus } from "@/types"

// ============================================================
// Chat Intent Classification
// ============================================================
export type ChatIntentType =
  | "generate_article"
  | "edit_article_field"
  | "edit_default"
  | "query_articles"
  | "count_articles"
  | "preview_article"
  | "help"
  | "unknown"

export interface ChatIntent {
  type: ChatIntentType
  /** Article title / keyword referenced */
  articleRef?: string
  /** Field being edited (keyword, slug, category, title, etc.) */
  field?: string
  /** New value for the field */
  value?: string
  /** Status filter for queries */
  statusFilter?: ArticleStatus
  /** Category for generation */
  category?: ArticleCategory
}

// ============================================================
// Chat Messages
// ============================================================
export type ChatRole = "user" | "assistant"

export interface ChatActionButton {
  label: string
  action: string
  /** Payload passed when button is clicked */
  payload?: Record<string, string>
}

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  timestamp: number
  buttons?: ChatActionButton[]
}

// ============================================================
// Action Results
// ============================================================
export interface ActionResult {
  success: boolean
  message: string
  data?: {
    articles?: Article[]
    article?: Partial<Article>
    count?: number
    articleId?: string
  }
}

// ============================================================
// Command Bus (chat → pages)
// ============================================================
export type ChatCommandType =
  | "open_article_wizard"
  | "open_article_preview"
  | "navigate"

export interface ChatCommand {
  type: ChatCommandType
  payload: Record<string, string>
}

// ============================================================
// Pending Confirmation (multi-step flows)
// ============================================================
export interface PendingConfirmation {
  type: "generate_article"
  data: {
    title: string
    keyword: string
    slug: string
    category: ArticleCategory
    contentPath?: string
  }
}
