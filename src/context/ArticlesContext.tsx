import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"
import { readUserArticles, addUserArticle, updateUserArticle, deleteUserArticle } from "@/lib/firestore"
import type { Article } from "@/types"

interface ArticlesContextValue {
  articles: Article[]
  addArticle: (article: Article) => void
  updateArticle: (id: string, updates: Partial<Article>) => void
  deleteArticle: (id: string) => void
  getArticleById: (id: string) => Article | undefined
  getArticleBySlug: (slug: string) => Article | undefined
  loading: boolean
}

const ArticlesContext = createContext<ArticlesContextValue | null>(null)

export function ArticlesProvider({ children, uid }: { children: ReactNode; uid?: string }) {
  const [articles, setArticles] = useLocalStorage<Article[]>(
    STORAGE_KEYS.ARTICLES,
    []
  )
  const [loading, setLoading] = useState(false)
  const [firestoreLoaded, setFirestoreLoaded] = useState(false)

  useEffect(() => {
    if (!uid || firestoreLoaded) return
    setLoading(true)
    readUserArticles(uid)
      .then((data) => {
        if (data.length > 0) {
          setArticles(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setFirestoreLoaded(true)
      })
  }, [uid, firestoreLoaded, setArticles])

  const addArticle = useCallback(
    (article: Article) => {
      setArticles((prev) => [...prev, article])
      if (uid) {
        addUserArticle(uid, article).catch(() => {})
      }
    },
    [setArticles, uid]
  )

  const updateArticleFn = useCallback(
    (id: string, updates: Partial<Article>) => {
      const updatesWithTimestamp = { ...updates, updatedAt: new Date().toISOString() }
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updatesWithTimestamp } : a))
      )
      if (uid) {
        updateUserArticle(uid, id, updatesWithTimestamp).catch(() => {})
      }
    },
    [setArticles, uid]
  )

  const deleteArticleFn = useCallback(
    (id: string) => {
      setArticles((prev) => prev.filter((a) => a.id !== id))
      if (uid) {
        deleteUserArticle(uid, id).catch(() => {})
      }
    },
    [setArticles, uid]
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
        updateArticle: updateArticleFn,
        deleteArticle: deleteArticleFn,
        getArticleById,
        getArticleBySlug,
        loading,
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
