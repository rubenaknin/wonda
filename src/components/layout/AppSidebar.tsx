import { useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Building2, Library, Settings, Shield, LogOut } from "lucide-react"
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
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/lib/constants"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { usePlan } from "@/context/PlanContext"
import { useAuth } from "@/context/AuthContext"

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: ROUTES.DASHBOARD },
  { title: "Company Profile", icon: Building2, path: ROUTES.COMPANY_PROFILE },
  { title: "Content Library", icon: Library, path: ROUTES.CONTENT_LIBRARY },
  { title: "Settings", icon: Settings, path: ROUTES.SETTINGS },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profileCompletion } = useCompanyProfile()
  const { plan, articlesRemaining } = usePlan()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate("/login")
  }

  return (
    <Sidebar className="bg-[#F8FAFC] border-r border-border">
      <SidebarHeader className="p-6">
        <img
          src="/wonda-logo.png"
          alt="Wonda"
          style={{ height: 28, width: "auto" }}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    className="transition-colors duration-200"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                    {item.path === ROUTES.COMPANY_PROFILE &&
                      profileCompletion < 100 && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[10px] px-1.5 py-0 bg-[#F59E0B]/10 text-[#F59E0B]"
                        >
                          ~5 min
                        </Badge>
                      )}
                    {item.path === ROUTES.COMPANY_PROFILE &&
                      profileCompletion === 100 && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[10px] px-1.5 py-0 bg-[#10B981]/10 text-[#10B981]"
                        >
                          Done
                        </Badge>
                      )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
      <SidebarFooter className="p-4 border-t border-border">
        {user && (
          <div className="text-xs text-muted-foreground truncate mb-2">
            {user.email}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{plan.tier} Plan</span>
          <span>
            {articlesRemaining === Infinity
              ? "Unlimited"
              : `${articlesRemaining} articles left`}
          </span>
        </div>
        {user?.planTier === "trial" && (
          <div className="mt-1">
            <Badge className="text-[9px] bg-[#F59E0B]/10 text-[#F59E0B]">
              Trial
            </Badge>
          </div>
        )}
        {profileCompletion < 100 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Profile</span>
              <span>{profileCompletion}%</span>
            </div>
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0061FF] transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground hover:text-destructive justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
