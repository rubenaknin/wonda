import type { VercelRequest, VercelResponse } from "@vercel/node"
import Anthropic from "@anthropic-ai/sdk"

const SYSTEM_PROMPT = `You are the intent classifier for Wonda, an AI content management platform.
Your job is to understand what the user wants and call the appropriate tool.

AVAILABLE TOOLS:
- generate_article: User wants to create/generate/write a new article. Extract the topic/title. IMPORTANT: The articleRef MUST be a meaningful topic or title, NOT generic words like "new article", "an article", "article". If the user says "create an article" or "create a new article" without specifying a topic/title, do NOT call this tool — instead respond asking what the article should be about.
- trigger_generation: User wants to actually generate/write the CONTENT of an existing article (run the AI writer). This is different from create — create adds a row, trigger_generation runs the AI to write the body content. Use when user says "generate content for X", "write the content of X", "run generation on X".
- edit_article_field: User wants to change a specific field of an existing article (keyword, title, slug, category, status, metaTitle, metaDescription, ctaText, authorId).
- edit_default: User wants to change a default setting for ALL future articles — triggered by words like "default", "always", "from now on", "all future". Fields: category, contentPaths (publish path/section), ctaText, authorAssignmentRules.
- query_articles: User wants to see/list/find articles, optionally filtered by status or date.
- count_articles: User wants to know how many articles they have, optionally filtered by status or date.
- preview_article: User wants to preview/view a specific article.
- help: User asks what you can do, asks for help, or asks about commands.

WHEN NOT TO CALL A TOOL:
- If the user asks for keyword suggestions, content ideas, topic recommendations, or strategy advice — respond naturally with helpful suggestions based on the company profile data provided. Do NOT call a tool.
- If the user's message is vague or doesn't match any tool clearly, respond with a helpful message. Do NOT call a tool.
- If information is missing (e.g., "create an article" without a topic), ask for the missing information. Do NOT call a tool.

IMPORTANT:
- You receive the full conversation history. Use it to resolve references like "it", "that article", "the one I just created", "its keyword", etc.
- For article references, extract the article name/title/keyword the user mentions. Strip surrounding quotes.
- For field names, normalize to: keyword, title, slug, category, status, metaTitle, metaDescription, ctaText, ctaUrl, authorId, contentPath.
- For status filters, normalize to: pending, draft, published, generating, error.
- For date filters: convert natural language like "older than 1 month" to days (e.g., 30), "last week" to 7, "last 3 months" to 90, etc.
- Be generous in matching — understand synonyms, varied phrasing, typos, and natural language.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: "generate_article",
    description:
      "Create a new article entry in the content library. The articleRef must be a meaningful topic/title — NOT generic words like 'new article'. If the user doesn't specify a topic, do NOT call this tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        articleRef: {
          type: "string",
          description:
            "The article topic, title, or keyword. Must be a specific, meaningful topic — not 'new article' or 'article'. Strip quotes.",
        },
        category: {
          type: "string",
          enum: ["blog", "landing-page", "comparison", "how-to", "glossary"],
          description:
            "Article category if specified by the user.",
        },
      },
      required: ["articleRef"],
    },
  },
  {
    name: "trigger_generation",
    description:
      "Run the AI content generation wizard on an existing article to write its body content. Use when user wants to actually generate/write the content, not just create a new entry.",
    input_schema: {
      type: "object" as const,
      properties: {
        articleRef: {
          type: "string",
          description: "The article title, keyword, or slug to generate content for.",
        },
      },
      required: ["articleRef"],
    },
  },
  {
    name: "edit_article_field",
    description:
      "Change/update a specific field of an existing article.",
    input_schema: {
      type: "object" as const,
      properties: {
        articleRef: {
          type: "string",
          description: "The article title, keyword, or slug. Strip quotes.",
        },
        field: {
          type: "string",
          enum: [
            "keyword", "title", "slug", "category", "status",
            "metaTitle", "metaDescription", "ctaText", "ctaUrl",
            "authorId", "contentPath",
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
          enum: ["category", "contentPaths", "ctaText", "ctaUrl", "authorAssignmentRules"],
          description: "The default setting to change. contentPaths = publish path/section/URL path.",
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
      "List/show/find articles in the content library, optionally filtered by status and/or date.",
    input_schema: {
      type: "object" as const,
      properties: {
        statusFilter: {
          type: "string",
          enum: ["pending", "draft", "published", "generating", "error"],
          description: "Optional status to filter by.",
        },
        olderThanDays: {
          type: "number",
          description: 'Filter articles older than N days. E.g., "older than 1 month" = 30.',
        },
        newerThanDays: {
          type: "number",
          description: 'Filter articles newer than N days. E.g., "last week" = 7.',
        },
      },
      required: [],
    },
  },
  {
    name: "count_articles",
    description:
      "Count how many articles are in the content library, optionally filtered by status and/or date.",
    input_schema: {
      type: "object" as const,
      properties: {
        statusFilter: {
          type: "string",
          enum: ["pending", "draft", "published", "generating", "error"],
          description: "Optional status to filter by.",
        },
        olderThanDays: {
          type: "number",
          description: 'Filter articles older than N days. E.g., "older than 1 month" = 30.',
        },
        newerThanDays: {
          type: "number",
          description: 'Filter articles newer than N days. E.g., "last week" = 7.',
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
          description: "The article title, keyword, or slug to preview. Strip quotes.",
        },
      },
      required: ["articleRef"],
    },
  },
  {
    name: "help",
    description: "User asks what you can do, asks for help, or wants to see available commands.",
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

  const { message, articleTitles, history, companyProfile } = req.body ?? {}
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message field" })
  }

  const client = new Anthropic({ apiKey })

  // Build context sections
  const contextParts: string[] = []

  if (articleTitles && articleTitles.length > 0) {
    contextParts.push(
      `Existing articles in the library: ${articleTitles.slice(0, 50).join(", ")}`
    )
  }

  if (companyProfile) {
    const cp = companyProfile
    const profileLines: string[] = []
    if (cp.name) profileLines.push(`Company: ${cp.name}`)
    if (cp.description) profileLines.push(`Description: ${cp.description}`)
    if (cp.valueProp) profileLines.push(`Value proposition: ${cp.valueProp}`)
    if (cp.websiteUrl) profileLines.push(`Website: ${cp.websiteUrl}`)
    if (cp.competitors?.length)
      profileLines.push(`Competitors: ${cp.competitors.join(", ")}`)
    if (cp.contentPaths?.length)
      profileLines.push(`Content paths: ${cp.contentPaths.join(", ")}`)
    if (profileLines.length > 0) {
      contextParts.push(`Company profile:\n${profileLines.join("\n")}`)
    }
  }

  const contextNote =
    contextParts.length > 0 ? "\n\n" + contextParts.join("\n\n") : ""

  // Build conversation messages from history
  const conversationMessages: Anthropic.MessageParam[] = []
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      const role = msg.role === "user" ? "user" : "assistant"
      const last = conversationMessages[conversationMessages.length - 1]
      if (last && last.role === role) {
        last.content = (last.content as string) + "\n" + msg.text
      } else {
        conversationMessages.push({ role, content: msg.text })
      }
    }
  }
  conversationMessages.push({ role: "user", content: message })

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT + contextNote,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      messages: conversationMessages,
    })

    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )

    if (toolBlock) {
      return res.status(200).json({
        intent: toolBlock.name,
        params: toolBlock.input,
      })
    }

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    )

    return res.status(200).json({
      intent: "unknown",
      params: {},
      fallbackText: textBlock?.text ?? undefined,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Classification failed"
    return res.status(500).json({ error: errMsg })
  }
}
