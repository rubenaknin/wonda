import { useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Brain,
  Library,
  MessageSquare,
  Shield,
  LogOut,
  Settings,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { ROUTES } from "@/lib/constants"
import { useAuth } from "@/context/AuthContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { useChat } from "@/context/ChatContext"

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { profile } = useCompanyProfile()
  const { setOpen } = useSidebar()
  const { sidebarOpen: chatSidebarOpen, toggleSidebar: toggleChatSidebar } = useChat()

  const clientDomain = user?.domain || (profile.websiteUrl ? profile.websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "")
  const clientName = profile.name || clientDomain?.split(".")[0] || "Wonda"

  const handleSignOut = async () => {
    await signOut()
    navigate("/login")
  }

  return (
    <Sidebar
      collapsible="icon"
      className="bg-[#F8FAFC] border-r border-border"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="px-3 py-4 flex flex-row items-center gap-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
        {clientDomain ? (
          <>
            <img
              src={`https://www.google.com/s2/favicons?domain=${clientDomain}&sz=32`}
              alt={clientName}
              className="w-6 h-6 rounded shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = "/wonda-logo.png" }}
            />
            <span className="text-sm font-semibold truncate group-data-[collapsible=icon]:hidden">
              {clientName}
            </span>
          </>
        ) : (
          <>
            <img
              src="/wonda-logo.png"
              alt="Wonda"
              className="group-data-[collapsible=icon]:hidden"
              style={{ height: 22, width: "auto", maxWidth: 100, objectFit: "contain" }}
            />
            <img
              src="/wonda-logo.png"
              alt="Wonda"
              className="hidden group-data-[collapsible=icon]:block"
              style={{ height: 20, width: 20, objectFit: "contain" }}
            />
          </>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === ROUTES.DASHBOARD}
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  tooltip="Dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="flex-1">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === ROUTES.CONTENT_LIBRARY}
                  onClick={() => navigate(ROUTES.CONTENT_LIBRARY)}
                  tooltip="Content Library"
                >
                  <Library className="h-4 w-4" />
                  <span className="flex-1">Content Library</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === ROUTES.COMPANY_PROFILE}
                  onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
                  tooltip="Intelligence"
                >
                  <Brain className="h-4 w-4" />
                  <span className="flex-1">Intelligence</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={chatSidebarOpen}
                  onClick={toggleChatSidebar}
                  tooltip="Chat"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="flex-1">Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith("/admin")}
                    onClick={() => navigate(ROUTES.ADMIN)}
                    tooltip="Admin"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="flex-1">Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname === ROUTES.SETTINGS}
              onClick={() => navigate(ROUTES.SETTINGS)}
              tooltip="Settings"
            >
              <Settings className="h-4 w-4" />
              <span className="flex-1">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
              tooltip="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
