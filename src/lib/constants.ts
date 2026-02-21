import type { ArticleCategory, PricingTier, WebhookUrls, WizardStep } from "@/types"

export const STORAGE_KEYS = {
  WEBHOOK_URLS: "wonda_webhook_urls",
  COMPANY_PROFILE: "wonda_company_profile",
  ARTICLES: "wonda_articles",
  PLAN: "wonda_plan",
  CMS_INTEGRATION: "wonda_cms_integration",
  GSC_DATA: "wonda_gsc_data",
  CHAT_HISTORY: "wonda_chat_history",
} as const

export const ALL_LOCAL_STORAGE_KEYS = [
  ...Object.values(STORAGE_KEYS),
  "wonda_articles_seeded",
  "wonda_table_version",
  "wonda_table_views",
  "wonda_active_view",
] as const

export const ROUTES = {
  DASHBOARD: "/",
  COMPANY_PROFILE: "/company-profile",
  CONTENT_LIBRARY: "/content-library",
  SETTINGS: "/settings",
  ADMIN: "/admin",
  LOGIN: "/login",
  VERIFY_EMAIL: "/verify-email",
  ONBOARDING: "/onboarding",
} as const

export const REVIEW_PLATFORMS = [
  "Apple App Store",
  "Google Play Store",
  "G2",
  "Gartner",
  "Trustpilot",
  "Capterra",
  "TripAdvisor",
  "Yelp",
  "Amazon",
] as const

export const ARTICLE_CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: "blog", label: "Blog Post" },
  { value: "landing-page", label: "Landing Page" },
  { value: "comparison", label: "Comparison" },
  { value: "how-to", label: "How-To Guide" },
  { value: "glossary", label: "Glossary" },
]

export const WIZARD_STEPS: WizardStep[] = [
  "keyword",
  "slug",
  "category",
  "generate",
  "editor",
  "metadata",
  "export",
]

export const WEBHOOK_WORKFLOWS: {
  key: keyof WebhookUrls
  label: string
  description: string
}[] = [
  {
    key: "generateSlug",
    label: "Generate Slug",
    description:
      "Auto-generates a unique slug for the article. Two identical slugs cannot exist.",
  },
  {
    key: "generateLinks",
    label: "Generate Internal Links",
    description:
      "Based on the blog sitemap, suggests internal link targets for the article.",
  },
  {
    key: "generateArticle",
    label: "Generate Article",
    description:
      "Data sourcing from intelligence bank + generates article body, FAQ, and meta data.",
  },
  {
    key: "generateCta",
    label: "Generate CTA",
    description: "Generates a call-to-action block for the article.",
  },
  {
    key: "analyzeKeywords",
    label: "Analyze Keywords",
    description:
      "Analyzes a batch of keywords for search volume, difficulty, and intent.",
  },
  {
    key: "researchKeywords",
    label: "Research Keywords",
    description:
      "Uses Wonda proprietary research to discover high-value keyword opportunities.",
  },
]

export const PLAN_LIMITS: Record<PricingTier, number> = {
  starter: 20,
  growth: 100,
  enterprise: Infinity,
}

export const PLAN_DETAILS: {
  tier: PricingTier
  name: string
  price: number | null
  articleLimit: number
  features: string[]
}[] = [
  {
    tier: "starter",
    name: "Starter",
    price: 500,
    articleLimit: 20,
    features: [
      "Up to 20 articles/month",
      "SEO-optimized content generation",
      "CSV keyword upload",
      "Google Sheets export",
      "Company intelligence bank",
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    price: 1000,
    articleLimit: 100,
    features: [
      "Up to 100 articles/month",
      "Everything in Starter",
      "Wonda Keyword Research Platform",
      "Priority generation queue",
      "Advanced analytics",
    ],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: null,
    articleLimit: Infinity,
    features: [
      "Unlimited articles",
      "Everything in Growth",
      "Dedicated account manager",
      "Custom n8n workflow integrations",
      "SSO & team management",
    ],
  },
]
