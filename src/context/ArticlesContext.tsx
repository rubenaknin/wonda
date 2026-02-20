import { createContext, useContext, useCallback, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"
import type { Article } from "@/types"

interface ArticlesContextValue {
  articles: Article[]
  addArticle: (article: Article) => void
  updateArticle: (id: string, updates: Partial<Article>) => void
  deleteArticle: (id: string) => void
  getArticleById: (id: string) => Article | undefined
  getArticleBySlug: (slug: string) => Article | undefined
}

const ArticlesContext = createContext<ArticlesContextValue | null>(null)

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useLocalStorage<Article[]>(
    STORAGE_KEYS.ARTICLES,
    []
  )

  const addArticle = useCallback(
    (article: Article) => {
      setArticles((prev) => [...prev, article])
    },
    [setArticles]
  )

  const updateArticle = useCallback(
    (id: string, updates: Partial<Article>) => {
      setArticles((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, ...updates, updatedAt: new Date().toISOString() }
            : a
        )
      )
    },
    [setArticles]
  )

  const deleteArticle = useCallback(
    (id: string) => {
      setArticles((prev) => prev.filter((a) => a.id !== id))
    },
    [setArticles]
  )

  const getArticleById = useCallback(
    (id: string) => articles.find((a) => a.id === id),
    [articles]
  )

  const getArticleBySlug = useCallback(
    (slug: string) => articles.find((a) => a.slug === slug),
    [articles]
  )

  return (
    <ArticlesContext.Provider
      value={{
        articles,
        addArticle,
        updateArticle,
        deleteArticle,
        getArticleById,
        getArticleBySlug,
      }}
    >
      {children}
    </ArticlesContext.Provider>
  )
}

export function useArticles() {
  const context = useContext(ArticlesContext)
  if (!context) {
    throw new Error("useArticles must be used within an ArticlesProvider")
  }
  return context
}
