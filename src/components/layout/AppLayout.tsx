import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { ChatSplitLayout } from "@/components/chat/ChatSplitLayout"
import { ChatFloatingWidget } from "@/components/chat/ChatFloatingWidget"
import { useChat } from "@/context/ChatContext"

export function AppLayout() {
  const navigate = useNavigate()
  const { commandBus } = useChat()

  // Global navigate command handler
  useEffect(() => {
    return commandBus.subscribe((command) => {
      if (command.type === "navigate" && command.payload.path) {
        navigate(command.payload.path)
      }
    })
  }, [commandBus, navigate])

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <ChatSplitLayout>
            <div className="p-6 lg:p-8">
              <Outlet />
            </div>
          </ChatSplitLayout>
        </main>
      </div>
      <ChatFloatingWidget />
    </SidebarProvider>
  )
}
