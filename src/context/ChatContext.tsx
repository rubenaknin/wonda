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

      // Add user message
      const userMsg: ChatMessage = {
        id: `msg_user_${Date.now()}`,
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      }
      dispatch({ type: "ADD_MESSAGE", message: userMsg })
      dispatch({ type: "SET_PROCESSING", value: true })

      // Simulate async processing (50ms delay for typing indicator)
      setTimeout(() => {
        // Check if this is a confirmation for pending flow
        if (state.pendingConfirmation && /\b(yes|confirm|ok|sure|go)\b/i.test(trimmed)) {
          const result = confirmGeneration(state.pendingConfirmation, {
            articles: articlesCtx.articles,
            addArticle: articlesCtx.addArticle,
            updateArticle: articlesCtx.updateArticle,
            getArticleById: articlesCtx.getArticleById,
          })
          dispatch({ type: "ADD_MESSAGE", message: result.response })
          dispatch({ type: "SET_PENDING", pending: null })
          emitCommand(result.command)
        } else {
          const result = processMessage(
            trimmed,
            {
              articles: articlesCtx.articles,
              addArticle: articlesCtx.addArticle,
              updateArticle: articlesCtx.updateArticle,
              getArticleById: articlesCtx.getArticleById,
            },
            {
              profile: profileCtx.profile,
              updateProfile: profileCtx.updateProfile,
            }
          )
          dispatch({ type: "ADD_MESSAGE", message: result.response })
          if (result.pendingConfirmation) {
            dispatch({ type: "SET_PENDING", pending: result.pendingConfirmation })
          }
          emitCommand(result.command)
        }
        dispatch({ type: "SET_PROCESSING", value: false })
      }, 50)
    },
    [state.pendingConfirmation, articlesCtx, profileCtx, emitCommand]
  )

  const handleButtonClick = useCallback(
    (action: string, payload?: Record<string, string>) => {
      // Handle confirm_generate specially
      if (action === "confirm_generate" && state.pendingConfirmation) {
        dispatch({ type: "SET_PROCESSING", value: true })
        setTimeout(() => {
          const result = confirmGeneration(state.pendingConfirmation!, {
            articles: articlesCtx.articles,
            addArticle: articlesCtx.addArticle,
            updateArticle: articlesCtx.updateArticle,
            getArticleById: articlesCtx.getArticleById,
          })
          dispatch({ type: "ADD_MESSAGE", message: result.response })
          dispatch({ type: "SET_PENDING", pending: null })
          dispatch({ type: "SET_PROCESSING", value: false })
          emitCommand(result.command)
        }, 50)
        return
      }

      // Handle navigation
      const cmd = handleActionButton(action, payload)
      if (cmd) {
        emitCommand(cmd)
      }
    },
    [state.pendingConfirmation, articlesCtx, emitCommand]
  )

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
