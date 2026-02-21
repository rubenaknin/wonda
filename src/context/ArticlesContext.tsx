import { createContext, useContext, useCallback, useEffect, useState, useRef, type ReactNode } from "react"
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

function writeCache(articles: Article[]) {
  try { localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles)) } catch {}
}

const UNSET = Symbol("unset")

export function ArticlesProvider({ children, uid }: { children: ReactNode; uid?: string }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const prevUidRef = useRef<string | typeof UNSET | undefined>(UNSET)

  // When uid changes (or on first mount): reset state, then load from Firestore
  useEffect(() => {
    if (prevUidRef.current !== UNSET && prevUidRef.current === uid) return
    prevUidRef.current = uid

    if (!uid) {
      // Signed out — clear everything
      setArticles([])
      writeCache([])
      return
    }

    // New user signed in (or fresh mount) — always load from Firestore
    setLoading(true)
    setArticles([]) // clear stale data immediately
    readUserArticles(uid)
      .then((data) => {
        setArticles(data)
        writeCache(data)
      })
      .catch(() => {
        setArticles([])
        writeCache([])
      })
      .finally(() => setLoading(false))
  }, [uid])

  const addArticle = useCallback(
    (article: Article) => {
      setArticles((prev) => {
        const next = [...prev, article]
        writeCache(next)
        return next
      })
      if (uid) {
        addUserArticle(uid, article).catch(() => {})
      }
    },
    [uid]
  )

  const updateArticleFn = useCallback(
    (id: string, updates: Partial<Article>) => {
      const updatesWithTimestamp = { ...updates, updatedAt: new Date().toISOString() }
      setArticles((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, ...updatesWithTimestamp } : a))
        writeCache(next)
        return next
      })
      if (uid) {
        updateUserArticle(uid, id, updatesWithTimestamp).catch(() => {})
      }
    },
    [uid]
  )

  const deleteArticleFn = useCallback(
    (id: string) => {
      setArticles((prev) => {
        const next = prev.filter((a) => a.id !== id)
        writeCache(next)
        return next
      })
      if (uid) {
        deleteUserArticle(uid, id).catch(() => {})
      }
    },
    [uid]
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
