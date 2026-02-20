import { useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Building2,
  Library,
  Shield,
  LogOut,
  Settings,
  PanelLeftClose,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/lib/constants"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { useAuth } from "@/context/AuthContext"

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profileCompletion } = useCompanyProfile()
  const { user, signOut } = useAuth()
  const { toggleSidebar } = useSidebar()

  const profileIncomplete = profileCompletion < 100

  const handleSignOut = async () => {
    await signOut()
    navigate("/login")
  }

  return (
    <Sidebar className="bg-[#F8FAFC] border-r border-border">
      <SidebarHeader className="px-3 py-4 flex flex-row items-center justify-between">
        <img
          src="/wonda-logo.png"
          alt="Wonda"
          style={{ height: 22, width: "auto", maxWidth: 100, objectFit: "contain" }}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={toggleSidebar}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === ROUTES.DASHBOARD}
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  className="transition-colors duration-200"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="flex-1">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {profileIncomplete && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === ROUTES.COMPANY_PROFILE}
                    onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
                    className="transition-colors duration-200"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="flex-1">Company Profile</span>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] px-1.5 py-0 bg-[#F59E0B]/10 text-[#F59E0B]"
                    >
                      {profileCompletion}%
                    </Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === ROUTES.CONTENT_LIBRARY}
                  onClick={() => navigate(ROUTES.CONTENT_LIBRARY)}
                  className="transition-colors duration-200"
                >
                  <Library className="h-4 w-4" />
                  <span className="flex-1">Content Library</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith("/admin")}
                    onClick={() => navigate(ROUTES.ADMIN)}
                    className="transition-colors duration-200"
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
              className="transition-colors duration-200"
            >
              <Settings className="h-4 w-4" />
              <span className="flex-1">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="transition-colors duration-200 text-muted-foreground hover:text-destructive"
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
