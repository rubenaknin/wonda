import type { ReactNode } from "react"
import { useChat } from "@/context/ChatContext"
import { ChatPanel } from "./ChatPanel"

interface ChatSplitLayoutProps {
  children: ReactNode
}

export function ChatSplitLayout({ children }: ChatSplitLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useChat()

  if (!sidebarOpen) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-full">
      {/* Chat panel — 25% width, min 320px, full viewport height */}
      <div className="w-1/4 min-w-[320px] shrink-0">
        <ChatPanel variant="sidebar" onClose={() => setSidebarOpen(false)} />
      </div>
      {/* Page content — scrolls independently */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
