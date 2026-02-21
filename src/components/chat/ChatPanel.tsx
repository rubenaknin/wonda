import { useEffect, useRef, useState } from "react"
import { X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChat } from "@/context/ChatContext"
import { ChatMessage } from "./ChatMessage"
import { ChatTypingIndicator } from "./ChatTypingIndicator"
import { ChatInput } from "./ChatInput"
import { cn } from "@/lib/utils"

interface ChatPanelProps {
  variant: "sidebar" | "floating"
  onClose?: () => void
}

const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

export function ChatPanel({ variant, onClose }: ChatPanelProps) {
  const { messages, isProcessing, sendMessage, handleButtonClick, clearMessages } = useChat()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showWelcomeBack, setShowWelcomeBack] = useState(false)
  const welcomeCheckDone = useRef(false)

  // Check for inactivity on mount
  useEffect(() => {
    if (welcomeCheckDone.current) return
    welcomeCheckDone.current = true

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      const elapsed = Date.now() - lastMsg.timestamp
      if (elapsed > INACTIVITY_THRESHOLD_MS) {
        setShowWelcomeBack(true)
      }
    }
  }, [messages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isProcessing])

  const handleContinue = () => {
    setShowWelcomeBack(false)
  }

  const handleStartFresh = () => {
    clearMessages()
    setShowWelcomeBack(false)
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        variant === "sidebar"
          ? "h-screen border-r border-border"
          : "h-full rounded-t-xl"
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium">Wonda Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="New conversation"
              onClick={handleStartFresh}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages — plain div with overflow-y-auto for reliable scrolling */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ minHeight: 0, overscrollBehavior: "contain" }}
      >
        <div className="space-y-3">
          {/* Welcome back prompt */}
          {showWelcomeBack && (
            <div className="rounded-xl bg-muted p-4 text-center text-sm">
              <p className="font-medium">Welcome back!</p>
              <p className="mt-1 text-muted-foreground">
                You have a previous conversation. Would you like to continue or start fresh?
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={handleContinue}>
                  Continue
                </Button>
                <Button size="sm" onClick={handleStartFresh}>
                  Start Fresh
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !showWelcomeBack && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p className="font-medium">Hi! I'm your Wonda Assistant.</p>
              <p className="mt-1">
                I can help you create articles, generate content, edit your library, and suggest keywords. Type "help" to see what I can do.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onButtonClick={handleButtonClick}
            />
          ))}
          {isProcessing && <ChatTypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput onSend={sendMessage} disabled={isProcessing} />
      </div>
    </div>
  )
}
