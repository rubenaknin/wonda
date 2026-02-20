import { useReducer, useCallback } from "react"
import type { WizardStep, ArticleCategory, FaqItem } from "@/types"
import { WIZARD_STEPS } from "@/lib/constants"

interface WizardState {
  currentStep: WizardStep
  keyword: string
  slug: string
  category: ArticleCategory | ""
  internalLinks: string[]
  selectedQuestions: string[]
  isGenerating: boolean
  generationProgress: number
  generationStatus: string
  bodyHtml: string
  faqHtml: string
  faqItems: FaqItem[]
  metaTitle: string
  metaDescription: string
  ctaText: string
  ctaUrl: string
  title: string
  authorId: string
}

type WizardAction =
  | { type: "SET_KEYWORD"; keyword: string }
  | { type: "SET_SLUG"; slug: string }
  | { type: "SET_CATEGORY"; category: ArticleCategory }
  | { type: "SET_AUTHOR"; authorId: string }
  | { type: "SET_TITLE"; title: string }
  | { type: "START_GENERATION" }
  | {
      type: "UPDATE_GENERATION_PROGRESS"
      progress: number
      status: string
    }
  | {
      type: "GENERATION_COMPLETE"
      bodyHtml: string
      faqHtml: string
      faqItems: FaqItem[]
      title: string
    }
  | { type: "GENERATION_ERROR"; error: string }
  | { type: "UPDATE_BODY"; bodyHtml: string }
  | { type: "UPDATE_FAQ"; faqHtml: string }
  | { type: "UPDATE_FAQ_ITEMS"; faqItems: FaqItem[] }
  | { type: "ADD_FAQ_ITEM" }
  | { type: "REMOVE_FAQ_ITEM"; id: string }
  | { type: "UPDATE_FAQ_ITEM"; id: string; field: "question" | "answer"; value: string }
  | {
      type: "UPDATE_META"
      field: "metaTitle" | "metaDescription"
      value: string
    }
  | { type: "UPDATE_CTA"; field: "ctaText" | "ctaUrl"; value: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; step: WizardStep }
  | { type: "RESET" }
  | { type: "LOAD_ARTICLE"; state: Partial<WizardState> }

const initialState: WizardState = {
  currentStep: "keyword",
  keyword: "",
  slug: "",
  category: "",
  internalLinks: [],
  selectedQuestions: [],
  isGenerating: false,
  generationProgress: 0,
  generationStatus: "",
  bodyHtml: "",
  faqHtml: "",
  faqItems: [],
  metaTitle: "",
  metaDescription: "",
  ctaText: "",
  ctaUrl: "",
  title: "",
  authorId: "",
}

function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step)
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_KEYWORD":
      return { ...state, keyword: action.keyword }
    case "SET_SLUG":
      return { ...state, slug: action.slug }
    case "SET_CATEGORY":
      return { ...state, category: action.category }
    case "SET_TITLE":
      return { ...state, title: action.title }
    case "SET_AUTHOR":
      return { ...state, authorId: action.authorId }
    case "START_GENERATION":
      return {
        ...state,
        isGenerating: true,
        generationProgress: 0,
        generationStatus: "Initializing...",
      }
    case "UPDATE_GENERATION_PROGRESS":
      return {
        ...state,
        generationProgress: action.progress,
        generationStatus: action.status,
      }
    case "GENERATION_COMPLETE":
      return {
        ...state,
        isGenerating: false,
        generationProgress: 100,
        generationStatus: "Complete!",
        bodyHtml: action.bodyHtml,
        faqHtml: action.faqHtml,
        faqItems: action.faqItems,
        title: action.title,
      }
    case "GENERATION_ERROR":
      return {
        ...state,
        isGenerating: false,
        generationStatus: `Error: ${action.error}`,
      }
    case "UPDATE_BODY":
      return { ...state, bodyHtml: action.bodyHtml }
    case "UPDATE_FAQ":
      return { ...state, faqHtml: action.faqHtml }
    case "UPDATE_FAQ_ITEMS":
      return { ...state, faqItems: action.faqItems }
    case "ADD_FAQ_ITEM":
      return {
        ...state,
        faqItems: [
          ...state.faqItems,
          { id: crypto.randomUUID(), question: "", answer: "" },
        ],
      }
    case "REMOVE_FAQ_ITEM":
      return {
        ...state,
        faqItems: state.faqItems.filter((item) => item.id !== action.id),
      }
    case "UPDATE_FAQ_ITEM":
      return {
        ...state,
        faqItems: state.faqItems.map((item) =>
          item.id === action.id
            ? { ...item, [action.field]: action.value }
            : item
        ),
      }
    case "UPDATE_META":
      return { ...state, [action.field]: action.value }
    case "UPDATE_CTA":
      return { ...state, [action.field]: action.value }
    case "NEXT_STEP": {
      const idx = getStepIndex(state.currentStep)
      if (idx < WIZARD_STEPS.length - 1) {
        return { ...state, currentStep: WIZARD_STEPS[idx + 1] }
      }
      return state
    }
    case "PREV_STEP": {
      const idx = getStepIndex(state.currentStep)
      if (idx > 0) {
        return { ...state, currentStep: WIZARD_STEPS[idx - 1] }
      }
      return state
    }
    case "GO_TO_STEP":
      return { ...state, currentStep: action.step }
    case "RESET":
      return { ...initialState }
    case "LOAD_ARTICLE":
      return { ...state, ...action.state }
    default:
      return state
  }
}

export function useArticleWizard() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case "keyword":
        return state.keyword.trim().length > 0
      case "slug":
        return state.slug.trim().length > 0
      case "category":
        return state.category !== ""
      case "generate":
        return state.generationProgress === 100
      case "editor":
        return state.bodyHtml.length > 0
      case "metadata":
        return (
          state.metaTitle.trim().length > 0 &&
          state.metaDescription.trim().length > 0
        )
      case "export":
        return true
      default:
        return false
    }
  }, [state])

  const stepIndex = getStepIndex(state.currentStep)

  return { state, dispatch, canProceed, stepIndex }
}
