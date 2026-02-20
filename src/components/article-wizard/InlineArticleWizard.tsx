import { useEffect } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useArticleWizard } from "@/hooks/useArticleWizard"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { WizardProgress } from "./WizardProgress"
import { KeywordStep } from "./KeywordStep"
import { SlugStep } from "./SlugStep"
import { CategoryStep } from "./CategoryStep"
import { GenerateStep } from "./GenerateStep"
import { EditorStep } from "./EditorStep"
import { MetadataStep } from "./MetadataStep"
import { ExportStep } from "./ExportStep"
import type { Article, ArticleCategory, WizardStep, FaqItem } from "@/types"

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

function getResumeStep(article: Article): WizardStep {
  if (!article.slug) return "slug"
  if (!article.category) return "category"
  if (!article.bodyHtml) return "generate"
  return "editor"
}

interface InlineArticleWizardProps {
  editArticleId?: string
  startStep?: WizardStep
  onClose: () => void
}

export function InlineArticleWizard({
  editArticleId,
  startStep,
  onClose,
}: InlineArticleWizardProps) {
  const { state, dispatch, canProceed, stepIndex } = useArticleWizard()
  const { addArticle, updateArticle, getArticleById } = useArticles()
  const { profile } = useCompanyProfile()

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
        const existingArticle = editArticleId ? getArticleById(editArticleId) : null
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
        <CardTitle>
          {editArticleId ? "Edit Article" : "New Article"}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleSaveAndClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <WizardProgress currentStep={state.currentStep} />

        <div>{renderStep()}</div>

        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "PREV_STEP" })}
            disabled={stepIndex === 0}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveAndClose}>
              Save & Close
            </Button>
            {state.currentStep !== "export" && (
              <Button
                onClick={() => dispatch({ type: "NEXT_STEP" })}
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
