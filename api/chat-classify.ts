import type { VercelRequest, VercelResponse } from "@vercel/node"
import Anthropic from "@anthropic-ai/sdk"

const SYSTEM_PROMPT = `You are the intent classifier for Wonda, an AI content management platform.
Your job is to understand what the user wants and call the appropriate tool.

AVAILABLE TOOLS:
- generate_article: User wants to create/generate/write a new article. Extract the topic/title.
- edit_article_field: User wants to change a specific field of an existing article (keyword, title, slug, category, status, metaTitle, metaDescription, ctaText, authorId).
- edit_default: User wants to change a default setting for ALL future articles — triggered by words like "default", "always", "from now on", "all future". Fields: category, contentPaths (publish path/section), ctaText, authorAssignmentRules.
- query_articles: User wants to see/list/find articles, optionally filtered by status.
- count_articles: User wants to know how many articles they have, optionally filtered by status.
- preview_article: User wants to preview/view a specific article.
- help: User asks what you can do, asks for help, or asks about commands.

If the user's message doesn't match any tool, respond with a short helpful message suggesting what you can do. Do NOT call a tool in that case.

IMPORTANT:
- You receive the full conversation history. Use it to resolve references like "it", "that article", "the one I just created", "its keyword", etc.
- For article references, extract the article name/title/keyword the user mentions. Strip surrounding quotes. If the user refers to an article from a previous message (e.g. "change its keyword"), resolve the reference using conversation history.
- For field names, normalize to: keyword, title, slug, category, status, metaTitle, metaDescription, ctaText, ctaUrl, authorId, contentPath.
- For status filters, normalize to: pending, draft, published, generating, error.
- Be generous in matching — understand synonyms, varied phrasing, typos, and natural language.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: "generate_article",
    description:
      "Create/generate/write a new article. Use when the user wants to add a new article to their content library.",
    input_schema: {
      type: "object" as const,
      properties: {
        articleRef: {
          type: "string",
          description:
            "The article topic, title, or keyword the user wants to create. Extract from the user message, stripping quotes.",
        },
        category: {
          type: "string",
          enum: ["blog", "landing-page", "comparison", "how-to", "glossary"],
          description:
            "Article category if specified by the user. Defaults to blog if not mentioned.",
        },
      },
      required: ["articleRef"],
    },
  },
  {
    name: "edit_article_field",
    description:
      "Change/update a specific field of an existing article. Use when the user references a specific article and wants to modify one of its fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        articleRef: {
          type: "string",
          description:
            "The article title, keyword, or slug the user is referring to. Strip quotes.",
        },
        field: {
          type: "string",
          enum: [
            "keyword",
            "title",
            "slug",
            "category",
            "status",
            "metaTitle",
            "metaDescription",
            "ctaText",
            "ctaUrl",
            "authorId",
            "contentPath",
          ],
          description: "The field to update.",
        },
        value: {
          type: "string",
          description: "The new value for the field.",
        },
      },
      required: ["articleRef", "field", "value"],
    },
  },
  {
    name: "edit_default",
    description:
      'Change a default/global setting for ALL future articles. Triggered by phrases like "default", "always", "from now on", "all future articles", "every article".',
    input_schema: {
      type: "object" as const,
      properties: {
        field: {
          type: "string",
          enum: [
            "category",
            "contentPaths",
            "ctaText",
            "ctaUrl",
            "authorAssignmentRules",
          ],
          description:
            "The default setting to change. contentPaths = publish path/section/URL path.",
        },
        value: {
          type: "string",
          description: "The new default value.",
        },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "query_articles",
    description:
      "List/show/find articles in the content library, optionally filtered by status.",
    input_schema: {
      type: "object" as const,
      properties: {
        statusFilter: {
          type: "string",
          enum: ["pending", "draft", "published", "generating", "error"],
          description:
            "Optional status to filter by. Omit to show all articles.",
        },
      },
      required: [],
    },
  },
  {
    name: "count_articles",
    description:
      "Count how many articles are in the content library, optionally filtered by status.",
    input_schema: {
      type: "object" as const,
      properties: {
        statusFilter: {
          type: "string",
          enum: ["pending", "draft", "published", "generating", "error"],
          description:
            "Optional status to filter by. Omit to count all articles.",
        },
      },
      required: [],
    },
  },
  {
    name: "preview_article",
    description: "Preview/view/open a specific existing article.",
    input_schema: {
      type: "object" as const,
      properties: {
        articleRef: {
          type: "string",
          description:
            "The article title, keyword, or slug to preview. Strip quotes.",
        },
      },
      required: ["articleRef"],
    },
  },
  {
    name: "help",
    description:
      "User asks what you can do, asks for help, or wants to see available commands.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
]

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" })
  }

  const { message, articleTitles, history } = req.body ?? {}
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message field" })
  }

  const client = new Anthropic({ apiKey })

  // Build context about existing articles for the model
  const contextNote =
    articleTitles && articleTitles.length > 0
      ? `\n\nExisting articles in the library: ${articleTitles.slice(0, 50).join(", ")}`
      : ""

  // Build conversation messages from history for context
  const conversationMessages: Anthropic.MessageParam[] = []
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      const role = msg.role === "user" ? "user" : "assistant"
      // Avoid consecutive same-role messages by merging
      const last = conversationMessages[conversationMessages.length - 1]
      if (last && last.role === role) {
        last.content = (last.content as string) + "\n" + msg.text
      } else {
        conversationMessages.push({ role, content: msg.text })
      }
    }
  }
  // Add the current user message
  conversationMessages.push({ role: "user", content: message })

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT + contextNote,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      messages: conversationMessages,
    })

    // Check if the model called a tool
    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )

    if (toolBlock) {
      return res.status(200).json({
        intent: toolBlock.name,
        params: toolBlock.input,
      })
    }

    // No tool called — model responded with text (unknown intent)
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    )

    return res.status(200).json({
      intent: "unknown",
      params: {},
      fallbackText: textBlock?.text ?? undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Classification failed"
    return res.status(500).json({ error: message })
  }
}
