import type { ChatIntent, ActionResult, ChatActionButton, ChatMessage } from "./types"

/**
 * Build a ChatMessage from intent + action result.
 */
export function buildResponse(
  intent: ChatIntent,
  result: ActionResult
): Omit<ChatMessage, "id" | "timestamp"> {
  if (!result.success) {
    return { role: "assistant", text: result.message }
  }

  switch (intent.type) {
    case "generate_article":
      return buildGenerateResponse(result)
    case "trigger_generation":
      return buildTriggerGenerationResponse(result)
    case "edit_article_field":
      return buildEditResponse(result)
    case "edit_default":
      return { role: "assistant", text: result.message }
    case "query_articles":
      return buildQueryResponse(result)
    case "count_articles":
      return { role: "assistant", text: result.message }
    case "preview_article":
      return buildPreviewResponse(result)
    case "help":
      return buildHelpResponse()
    case "unknown":
    default:
      return buildUnknownResponse()
  }
}

// ============================================================
// Builders
// ============================================================

function buildGenerateResponse(result: ActionResult): Omit<ChatMessage, "id" | "timestamp"> {
  const article = result.data?.article
  if (!article) return { role: "assistant", text: "Something went wrong." }

  const title = article.title ?? "Untitled"
  const category = article.category ?? "blog"
  const slug = article.slug ?? ""
  const path = article.contentPath ?? "/blog"

  const buttons: ChatActionButton[] = [
    { label: "Confirm", action: "confirm_generate" },
    { label: "Change Category", action: "change_category" },
  ]

  return {
    role: "assistant",
    text: `Sure, I'll create **${title}** in the **${capitalize(category)}** category at \`${path}/${slug}\`. Sound good?`,
    buttons,
  }
}

function buildTriggerGenerationResponse(result: ActionResult): Omit<ChatMessage, "id" | "timestamp"> {
  const buttons: ChatActionButton[] = []
  if (result.data?.articleId) {
    const article = result.data.article
    const hasContent = article?.bodyHtml && article.bodyHtml.length > 0
    buttons.push({
      label: hasContent ? "Refresh Content" : "Generate Content",
      action: "generate_content",
      payload: { articleId: result.data.articleId },
    })
  }
  return { role: "assistant", text: result.message, buttons }
}

function buildEditResponse(result: ActionResult): Omit<ChatMessage, "id" | "timestamp"> {
  return { role: "assistant", text: result.message }
}

function buildQueryResponse(result: ActionResult): Omit<ChatMessage, "id" | "timestamp"> {
  const articles = result.data?.articles ?? []
  const count = result.data?.count ?? 0

  if (count === 0) {
    return { role: "assistant", text: result.message }
  }

  const lines = articles.slice(0, 10).map(
    (a) => `- **${a.title || a.keyword || a.slug}** (${a.status})`
  )
  const extra = count > 10 ? `\n- ...and ${count - 10} more` : ""

  const buttons: ChatActionButton[] = [
    { label: "View in Library", action: "navigate", payload: { path: "/content-library" } },
  ]

  return {
    role: "assistant",
    text: `Found **${count}** article${count !== 1 ? "s" : ""}:\n\n${lines.join("\n")}${extra}`,
    buttons,
  }
}

function buildPreviewResponse(result: ActionResult): Omit<ChatMessage, "id" | "timestamp"> {
  const buttons: ChatActionButton[] = []
  if (result.data?.articleId) {
    buttons.push(
      { label: "Preview", action: "preview", payload: { articleId: result.data.articleId } }
    )
    const article = result.data.article
    const hasContent = article?.bodyHtml && article.bodyHtml.length > 0
    if (!hasContent) {
      buttons.push(
        { label: "Generate Content", action: "generate_content", payload: { articleId: result.data.articleId } }
      )
    } else {
      buttons.push(
        { label: "Edit", action: "edit", payload: { articleId: result.data.articleId } }
      )
    }
  }
  return { role: "assistant", text: result.message, buttons }
}

function buildHelpResponse(): Omit<ChatMessage, "id" | "timestamp"> {
  return {
    role: "assistant",
    text: `Here's what I can help you with:

- **Create articles** — "Create an article about 'best ai tools'"
- **Generate content** — "Generate content for 'best ai tools'"
- **Edit article fields** — "Change the keyword of 'best ai tools' to 'top ai tools'"
- **Update defaults** — "I want to always publish in /learn section"
- **Query your library** — "Show me all draft articles" or "Articles older than 1 month"
- **Count articles** — "How many articles do I have?"
- **Suggest keywords** — "Suggest some keyword ideas based on my company"
- **Preview articles** — "Preview 'best ai tools'"

Just type naturally and I'll figure out what you need!`,
  }
}

function buildUnknownResponse(): Omit<ChatMessage, "id" | "timestamp"> {
  return {
    role: "assistant",
    text: `I'm not sure I understand. I can help you **create articles**, **generate content**, **edit fields**, **change defaults**, **query your library**, and **suggest keywords**. Type "help" to see all commands.`,
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
