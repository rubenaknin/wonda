import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { processMessage, confirmGeneration, handleActionButton } from "@/lib/chat/engine"
import type { ChatMessage, ChatCommand, PendingConfirmation } from "@/lib/chat/types"

// ============================================================
// State
// ============================================================
interface ChatState {
  messages: ChatMessage[]
  isProcessing: boolean
  sidebarOpen: boolean
  floatingOpen: boolean
  pendingConfirmation: PendingConfirmation | null
}

type ChatAction =
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "SET_MESSAGES"; messages: ChatMessage[] }
  | { type: "SET_PROCESSING"; value: boolean }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SIDEBAR"; open: boolean }
  | { type: "TOGGLE_FLOATING" }
  | { type: "SET_FLOATING"; open: boolean }
  | { type: "SET_PENDING"; pending: PendingConfirmation | null }
  | { type: "CLEAR_MESSAGES" }

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] }
    case "SET_MESSAGES":
      return { ...state, messages: action.messages }
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.value }
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case "SET_SIDEBAR":
      return { ...state, sidebarOpen: action.open }
    case "TOGGLE_FLOATING":
      return { ...state, floatingOpen: !state.floatingOpen }
    case "SET_FLOATING":
      return { ...state, floatingOpen: action.open }
    case "SET_PENDING":
      return { ...state, pendingConfirmation: action.pending }
    case "CLEAR_MESSAGES":
      return { ...state, messages: [], pendingConfirmation: null }
    default:
      return state
  }
}

// ============================================================
// Command Bus
// ============================================================
type CommandListener = (command: ChatCommand) => void

function createCommandBus() {
  const listeners = new Set<CommandListener>()
  return {
    subscribe: (listener: CommandListener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    emit: (command: ChatCommand) => {
      listeners.forEach((fn) => fn(command))
    },
  }
}

// ============================================================
// Context
// ============================================================
interface ChatContextValue {
  messages: ChatMessage[]
  isProcessing: boolean
  sidebarOpen: boolean
  floatingOpen: boolean
  pendingConfirmation: PendingConfirmation | null
  sendMessage: (text: string) => void
  handleButtonClick: (action: string, payload?: Record<string, string>) => void
  clearMessages: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleFloating: () => void
  setFloatingOpen: (open: boolean) => void
  commandBus: ReturnType<typeof createCommandBus>
}

const ChatContext = createContext<ChatContextValue | null>(null)

// ============================================================
// Provider
// ============================================================
export function ChatProvider({ children }: { children: ReactNode }) {
  const [storedMessages, setStoredMessages] = useLocalStorage<ChatMessage[]>(
    STORAGE_KEYS.CHAT_HISTORY,
    []
  )

  const initialState: ChatState = {
    messages: storedMessages,
    isProcessing: false,
    sidebarOpen: false,
    floatingOpen: false,
    pendingConfirmation: null,
  }

  const [state, dispatch] = useReducer(chatReducer, initialState)
  const commandBusRef = useRef(createCommandBus())
  const articlesCtx = useArticles()
  const profileCtx = useCompanyProfile()

  // Use refs to avoid stale closures in async callbacks
  const pendingRef = useRef(state.pendingConfirmation)
  pendingRef.current = state.pendingConfirmation
  const messagesRef = useRef(state.messages)
  messagesRef.current = state.messages
  const articlesRef = useRef(articlesCtx)
  articlesRef.current = articlesCtx
  const profileRef = useRef(profileCtx)
  profileRef.current = profileCtx

  // Sync messages to localStorage
  useEffect(() => {
    setStoredMessages(state.messages)
  }, [state.messages, setStoredMessages])

  const emitCommand = useCallback(
    (cmd: { type: string; payload: Record<string, string> } | undefined) => {
      if (!cmd) return
      commandBusRef.current.emit({
        type: cmd.type as ChatCommand["type"],
        payload: cmd.payload,
      })
    },
    []
  )

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const userMsg: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      }
      dispatch({ type: "ADD_MESSAGE", message: userMsg })
      dispatch({ type: "SET_PROCESSING", value: true })

      // Check if this is a confirmation for pending flow
      const pending = pendingRef.current
      if (pending && /\b(yes|confirm|ok|sure|go|yep|yeah|do it)\b/i.test(trimmed)) {
        const result = confirmGeneration(pending, {
          articles: articlesRef.current.articles,
          addArticle: articlesRef.current.addArticle,
          updateArticle: articlesRef.current.updateArticle,
          getArticleById: articlesRef.current.getArticleById,
        })
        dispatch({ type: "ADD_MESSAGE", message: result.response })
        dispatch({ type: "SET_PENDING", pending: null })
        dispatch({ type: "SET_PROCESSING", value: false })
        emitCommand(result.command)
        return
      }

      // Async AI classification
      processMessage(
        trimmed,
        {
          articles: articlesRef.current.articles,
          addArticle: articlesRef.current.addArticle,
          updateArticle: articlesRef.current.updateArticle,
          getArticleById: articlesRef.current.getArticleById,
        },
        {
          profile: profileRef.current.profile,
          updateProfile: profileRef.current.updateProfile,
        },
        messagesRef.current
      )
        .then((result) => {
          dispatch({ type: "ADD_MESSAGE", message: result.response })
          if (result.pendingConfirmation) {
            dispatch({ type: "SET_PENDING", pending: result.pendingConfirmation })
          }
          emitCommand(result.command)
        })
        .catch(() => {
          dispatch({
            type: "ADD_MESSAGE",
            message: {
              id: `msg_err_${Date.now()}`,
              role: "assistant",
              text: "Sorry, something went wrong. Please try again.",
              timestamp: Date.now(),
            },
          })
        })
        .finally(() => {
          dispatch({ type: "SET_PROCESSING", value: false })
        })
    },
    [emitCommand]
  )

  const handleButtonClick = useCallback(
    (action: string, payload?: Record<string, string>) => {
      if (action === "confirm_generate" && pendingRef.current) {
        dispatch({ type: "SET_PROCESSING", value: true })
        const result = confirmGeneration(pendingRef.current, {
          articles: articlesRef.current.articles,
          addArticle: articlesRef.current.addArticle,
          updateArticle: articlesRef.current.updateArticle,
          getArticleById: articlesRef.current.getArticleById,
        })
        dispatch({ type: "ADD_MESSAGE", message: result.response })
        dispatch({ type: "SET_PENDING", pending: null })
        dispatch({ type: "SET_PROCESSING", value: false })
        emitCommand(result.command)
        return
      }

      const cmd = handleActionButton(action, payload)
      if (cmd) {
        emitCommand(cmd)
      }
    },
    [emitCommand]
  )

  const clearMessages = useCallback(() => {
    dispatch({ type: "CLEAR_MESSAGES" })
  }, [])

  const toggleSidebar = useCallback(() => dispatch({ type: "TOGGLE_SIDEBAR" }), [])
  const setSidebarOpen = useCallback((open: boolean) => dispatch({ type: "SET_SIDEBAR", open }), [])
  const toggleFloating = useCallback(() => dispatch({ type: "TOGGLE_FLOATING" }), [])
  const setFloatingOpen = useCallback((open: boolean) => dispatch({ type: "SET_FLOATING", open }), [])

  return (
    <ChatContext.Provider
      value={{
        messages: state.messages,
        isProcessing: state.isProcessing,
        sidebarOpen: state.sidebarOpen,
        floatingOpen: state.floatingOpen,
        pendingConfirmation: state.pendingConfirmation,
        sendMessage,
        handleButtonClick,
        clearMessages,
        toggleSidebar,
        setSidebarOpen,
        toggleFloating,
        setFloatingOpen,
        commandBus: commandBusRef.current,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
