// ============================================================
// User Profile (Firebase Auth + Firestore)
// ============================================================
export interface UserProfile {
  uid: string
  email: string
  domain: string
  displayName: string
  role: "user" | "admin"
  createdAt: string
  trialStartDate: string
  planTier: "trial" | "starter" | "growth" | "enterprise"
  stripeCustomerId: string
  stripeSubscriptionId: string
  onboardingComplete: boolean
  articlesUsed: number
}

// ============================================================
// Company Profile
// ============================================================
export interface CompanyProfile {
  // Step 1 - Brand DNA
  name: string
  description: string
  valueProp: string
  websiteUrl: string
  sitemapUrl: string
  contentSitemapUrls: string[]
  contentPaths: string[]
  reviewPlatforms: string[]
  // Step 2 - The Goal
  ctaText: string
  ctaUrl: string
  // Step 3 - Competitors
  competitors: Competitor[]
  // Step 4 - Intelligence Bank
  intelligenceBank: IntelligenceBankQuestion[]
  // Authors
  authors: Author[]
  authorAssignmentRules: string
  // Prompt instructions (free-text logic per section)
  brandDnaPrompt: string
  goalPrompt: string
  competitorsPrompt: string
  intelligenceBankPrompt: string
  // Integrations
  gscConnected: boolean
  gscPropertyUrl: string
}

export interface Competitor {
  id: string
  name: string
  url: string
}

export interface IntelligenceBankQuestion {
  id: string
  text: string
  enabled: boolean
}

export interface Author {
  id: string
  name: string
  role?: string
  bio?: string
}


// ============================================================
// Pricing
// ============================================================
export type PricingTier = "starter" | "growth" | "enterprise"

export interface PricingPlan {
  tier: PricingTier
  articlesUsed: number
  billingCycleStart: string
}

// ============================================================
// Webhook URLs (one per n8n workflow)
// ============================================================
export interface WebhookUrls {
  generateSlug: string
  generateLinks: string
  generateArticle: string
  generateCta: string
  analyzeKeywords: string
  researchKeywords: string
}

// ============================================================
// FAQ
// ============================================================
export interface FaqItem {
  id: string
  question: string
  answer: string
}

// ============================================================
// Articles
// ============================================================
export type ArticleStatus =
  | "pending"
  | "draft"
  | "published"
  | "generating"
  | "error"

export type ArticleCategory =
  | "blog"
  | "landing-page"
  | "comparison"
  | "how-to"
  | "glossary"

export interface Article {
  id: string
  title: string
  slug: string
  keyword: string
  category: ArticleCategory
  status: ArticleStatus
  bodyHtml: string
  faqHtml: string
  faqItems: FaqItem[]
  metaTitle: string
  metaDescription: string
  ctaText: string
  ctaUrl: string
  internalLinks: string[]
  selectedQuestions: string[]
  createdAt: string
  updatedAt: string
  metaImageUrl?: string
  source?: "new" | "sitemap"
  origin?: "existing" | "wonda"
  contentPath?: string
  authorId?: string
}

// ============================================================
// Article Wizard (7 steps — links & data sourcing handled by n8n)
// ============================================================
export type WizardStep =
  | "keyword"
  | "slug"
  | "category"
  | "generate"
  | "editor"
  | "metadata"
  | "export"

// ============================================================
// CMS Publishing Integration
// ============================================================
export type CmsType = "framer" | "webflow" | "wordpress" | "google-sheets" | "api"

export interface CmsIntegration {
  type: CmsType
  enabled: boolean
  config: Record<string, string>
}

// ============================================================
// Google Search Console
// ============================================================
export interface GscData {
  nonBrandedClicks: number
  nonBrandedImpressions: number
  blogClicks: number
  blogImpressions: number
  lastUpdated: string
}
