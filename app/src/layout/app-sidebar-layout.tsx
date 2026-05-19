import type { ReactNode } from "react"
import { Link, Outlet, useNavigate } from "react-router-dom"

import { Separator } from "@/components/ui/separator.tsx"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar.tsx"
import { useSidebarNavItems } from "@/hooks/useSidebar.ts"
import { authClient } from "@/lib/auth-client.ts"
import { LogOutIcon, UserIcon } from "lucide-react"

export type AppSidebarLayoutProps = {
  children?: ReactNode
}

function UserMenu() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authClient.signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex flex-col gap-2">
      <Separator className="bg-sidebar-border" />
      <div className="flex items-center gap-2 px-2 py-1">
        <UserIcon className="size-4 shrink-0 text-sidebar-foreground/70" />
        <span className="truncate text-sm text-sidebar-foreground">
          {session?.user?.email ?? "User"}
        </span>
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Log out" onClick={handleLogout}>
            <LogOutIcon />
            <span>Log out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  )
}

export function AppSidebarLayout({ children }: AppSidebarLayoutProps) {
  const navItems = useSidebarNavItems()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="Home">
                <Link to="/">
                  <span className="truncate font-semibold">App</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.isActive}
                        tooltip={item.tooltip}
                      >
                        <Link to={item.to}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
