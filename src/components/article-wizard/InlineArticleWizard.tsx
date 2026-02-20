import { useEffect, useMemo } from "react"
import { toast } from "sonner"
import { X, Trash2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useArticleWizard } from "@/hooks/useArticleWizard"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"
import { WizardProgress } from "./WizardProgress"
import { KeywordStep } from "./KeywordStep"
import { SlugStep } from "./SlugStep"
import { CategoryStep } from "./CategoryStep"
import { GenerateStep } from "./GenerateStep"
import { EditorStep } from "./EditorStep"
import { MetadataStep } from "./MetadataStep"
import { ExportStep } from "./ExportStep"
import type { Article, ArticleCategory, WizardStep as WizardStepType, FaqItem } from "@/types"

function faqItemsToHtml(items: FaqItem[]): string {
  if (items.length === 0) return ""
  const inner = items
    .map(
      (item) =>
        `<div class="faq-item"><h3>${item.question}</h3><p>${item.answer}</p></div>`
    )
    .join("\n")
  return `<h2>Frequently Asked Questions</h2>\n${inner}`
}

function getResumeStep(article: Article): WizardStepType {
  if (!article.slug) return "slug"
  if (!article.category) return "category"
  if (!article.bodyHtml) return "generate"
  return "editor"
}

interface InlineArticleWizardProps {
  editArticleId?: string
  startStep?: WizardStepType
  skipPreSteps?: boolean
  onClose: () => void
}

export function InlineArticleWizard({
  editArticleId,
  startStep,
  skipPreSteps,
  onClose,
}: InlineArticleWizardProps) {
  const { state, dispatch, canProceed } = useArticleWizard()
  const { addArticle, updateArticle, getArticleById, deleteArticle } = useArticles()
  const { profile } = useCompanyProfile()
  const { webhookUrls } = useWebhook()

  // Determine if this is editing an article that already has content
  const existingArticle = editArticleId ? getArticleById(editArticleId) : null
  const hasExistingContent = Boolean(existingArticle?.bodyHtml)

  // Steps to show based on context
  const visibleSteps = useMemo<WizardStepType[]>(() => {
    if (skipPreSteps) {
      // Coming from table Generate action
      return ["generate", "editor", "metadata", "export"]
    }
    if (editArticleId) {
      // Editing any existing article — never show keyword/slug/category/generate
      return ["editor", "metadata", "export"]
    }
    return ["keyword", "slug", "category", "generate", "editor", "metadata", "export"]
  }, [skipPreSteps, editArticleId])

  const visibleStepIndex = visibleSteps.indexOf(state.currentStep)
  const isFirstVisibleStep = visibleStepIndex === 0
  const isLastVisibleStep = visibleStepIndex === visibleSteps.length - 1

  useEffect(() => {
    if (editArticleId) {
      const article = getArticleById(editArticleId)
      if (article) {
        const resumeStep = startStep || getResumeStep(article)
        dispatch({
          type: "LOAD_ARTICLE",
          state: {
            currentStep: resumeStep,
            keyword: article.keyword,
            slug: article.slug,
            category: article.category,
            internalLinks: article.internalLinks,
            selectedQuestions: article.selectedQuestions,
            bodyHtml: article.bodyHtml,
            faqHtml: article.faqHtml,
            faqItems: article.faqItems || [],
            metaTitle: article.metaTitle,
            metaDescription: article.metaDescription,
            metaImageUrl: article.metaImageUrl || "",
            ctaText: article.ctaText,
            ctaUrl: article.ctaUrl,
            title: article.title,
            authorId: article.authorId || "",
            generationProgress: article.bodyHtml ? 100 : 0,
          },
        })
      }
    } else {
      dispatch({ type: "RESET" })
      if (profile.ctaText) {
        dispatch({
          type: "UPDATE_CTA",
          field: "ctaText",
          value: profile.ctaText,
        })
      }
      if (profile.ctaUrl) {
        dispatch({
          type: "UPDATE_CTA",
          field: "ctaUrl",
          value: profile.ctaUrl,
        })
      }
    }
  }, [editArticleId, startStep, getArticleById, dispatch, profile])

  const handleSaveAndClose = () => {
    const now = new Date().toISOString()
    const hasKeyword = state.keyword.trim().length > 0
    const hasBody = state.bodyHtml.length > 0

    if (editArticleId) {
      updateArticle(editArticleId, {
        title: state.title || state.keyword,
        keyword: state.keyword,
        slug: state.slug,
        category: (state.category || "blog") as ArticleCategory,
        bodyHtml: state.bodyHtml,
        faqHtml: faqItemsToHtml(state.faqItems),
        faqItems: state.faqItems,
        metaTitle: state.metaTitle,
        metaDescription: state.metaDescription,
        metaImageUrl: state.metaImageUrl || undefined,
        ctaText: state.ctaText,
        ctaUrl: state.ctaUrl,
        internalLinks: state.internalLinks,
        selectedQuestions: state.selectedQuestions,
        status: hasBody ? "draft" : "pending",
        authorId: state.authorId || undefined,
      })
      toast.success("Article updated")
    } else if (hasKeyword) {
      const newArticle: Article = {
        id: crypto.randomUUID(),
        title: state.title || state.keyword,
        keyword: state.keyword,
        slug: state.slug,
        category: (state.category || "blog") as ArticleCategory,
        status: hasBody ? "draft" : "pending",
        bodyHtml: state.bodyHtml,
        faqHtml: faqItemsToHtml(state.faqItems),
        faqItems: state.faqItems,
        metaTitle: state.metaTitle,
        metaDescription: state.metaDescription,
        metaImageUrl: state.metaImageUrl || undefined,
        ctaText: state.ctaText,
        ctaUrl: state.ctaUrl,
        internalLinks: state.internalLinks,
        selectedQuestions: state.selectedQuestions,
        createdAt: now,
        updatedAt: now,
        authorId: state.authorId || undefined,
      }
      addArticle(newArticle)
      toast.success(hasBody ? "Article saved to Content Library" : "Keyword saved to Content Library")
    }

    onClose()
  }

  const handleDelete = () => {
    if (!editArticleId) return
    deleteArticle(editArticleId)
    toast.success("Article deleted")
    onClose()
  }

  const handleRefreshAeo = async () => {
    if (!editArticleId) return
    await sendWebhook(
      webhookUrls.generateArticle,
      "refresh_aeo",
      { articleId: editArticleId, keyword: state.keyword }
    )
    toast.success("AEO refresh triggered")
  }

  const handlePrevStep = () => {
    const currentVisibleIdx = visibleSteps.indexOf(state.currentStep)
    if (currentVisibleIdx > 0) {
      dispatch({ type: "GO_TO_STEP", step: visibleSteps[currentVisibleIdx - 1] })
    }
  }

  const handleNextStep = () => {
    const currentVisibleIdx = visibleSteps.indexOf(state.currentStep)
    if (currentVisibleIdx < visibleSteps.length - 1) {
      dispatch({ type: "GO_TO_STEP", step: visibleSteps[currentVisibleIdx + 1] })
    }
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case "keyword":
        return (
          <KeywordStep
            keyword={state.keyword}
            onChange={(k) => dispatch({ type: "SET_KEYWORD", keyword: k })}
            authorId={state.authorId}
            onAuthorChange={(id) => dispatch({ type: "SET_AUTHOR", authorId: id })}
          />
        )
      case "slug":
        return (
          <SlugStep
            keyword={state.keyword}
            slug={state.slug}
            onChange={(s) => dispatch({ type: "SET_SLUG", slug: s })}
            editArticleId={editArticleId}
          />
        )
      case "category":
        return (
          <CategoryStep
            keyword={state.keyword}
            category={state.category}
            onChange={(c) => dispatch({ type: "SET_CATEGORY", category: c })}
          />
        )
      case "generate":
        return (
          <GenerateStep
            keyword={state.keyword}
            slug={state.slug}
            category={state.category}
            internalLinks={state.internalLinks}
            selectedQuestions={state.selectedQuestions}
            isGenerating={state.isGenerating}
            progress={state.generationProgress}
            status={state.generationStatus}
            onStart={() => dispatch({ type: "START_GENERATION" })}
            onProgress={(p, s) =>
              dispatch({
                type: "UPDATE_GENERATION_PROGRESS",
                progress: p,
                status: s,
              })
            }
            onComplete={(bodyHtml, faqHtml, faqItems, title) =>
              dispatch({
                type: "GENERATION_COMPLETE",
                bodyHtml,
                faqHtml,
                faqItems,
                title,
              })
            }
            onError={(error) =>
              dispatch({ type: "GENERATION_ERROR", error })
            }
          />
        )
      case "editor":
        return (
          <EditorStep
            bodyHtml={state.bodyHtml}
            faqHtml={state.faqHtml}
            faqItems={state.faqItems}
            onUpdateBody={(h) =>
              dispatch({ type: "UPDATE_BODY", bodyHtml: h })
            }
            onUpdateFaq={(h) => dispatch({ type: "UPDATE_FAQ", faqHtml: h })}
            onUpdateFaqItem={(id, field, value) =>
              dispatch({ type: "UPDATE_FAQ_ITEM", id, field, value })
            }
            onAddFaqItem={() => dispatch({ type: "ADD_FAQ_ITEM" })}
            onRemoveFaqItem={(id) => dispatch({ type: "REMOVE_FAQ_ITEM", id })}
          />
        )
      case "metadata": {
        return (
          <MetadataStep
            metaTitle={state.metaTitle}
            metaDescription={state.metaDescription}
            metaImageUrl={state.metaImageUrl}
            ctaText={state.ctaText}
            ctaUrl={state.ctaUrl}
            createdAt={existingArticle?.createdAt}
            updatedAt={existingArticle?.updatedAt}
            onUpdateMeta={(f, v) =>
              dispatch({ type: "UPDATE_META", field: f, value: v })
            }
            onUpdateCta={(f, v) =>
              dispatch({ type: "UPDATE_CTA", field: f, value: v })
            }
            onUpdateDate={(field, value) => {
              if (editArticleId) {
                updateArticle(editArticleId, { [field]: value })
              }
            }}
          />
        )
      }
      case "export":
        return (
          <ExportStep
            title={state.title}
            slug={state.slug}
            keyword={state.keyword}
            bodyHtml={state.bodyHtml}
            metaTitle={state.metaTitle}
            metaDescription={state.metaDescription}
          />
        )
    }
  }

  return (
    <Card className="wonda-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>
            {editArticleId ? "Edit Article" : "New Article"}
          </CardTitle>
          {(skipPreSteps || hasExistingContent) && state.keyword && (
            <p className="text-sm text-muted-foreground mt-1">
              {state.keyword}
              {state.title && state.title !== state.keyword && ` — ${state.title}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {editArticleId && hasExistingContent && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-[#F59E0B]"
                onClick={handleRefreshAeo}
                title="Full refresh — uses 1 article credit"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh (1 credit)</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                title="Delete article"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSaveAndClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <WizardProgress
          currentStep={state.currentStep}
          visibleSteps={visibleSteps}
          onStepClick={(step) => dispatch({ type: "GO_TO_STEP", step })}
        />

        <div>{renderStep()}</div>

        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handlePrevStep}
            disabled={isFirstVisibleStep}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAndClose}>
              Save & Close
            </Button>
            {!isLastVisibleStep && (
              <Button
                onClick={handleNextStep}
                disabled={!canProceed()}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
