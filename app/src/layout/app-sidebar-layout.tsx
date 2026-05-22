import { useState, type ReactNode } from "react"
import { Link, Outlet, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button.tsx"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
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
  useSidebar,
} from "@/components/ui/sidebar.tsx"
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { useSidebarNavItems } from "@/hooks/useSidebar.ts"
import { changePassword, clearAuthSession } from "@/lib/auth.ts"
import { queryClient } from "@/lib/query-client.ts"
import { KeyRound, LogOutIcon, UserIcon } from "lucide-react"

export type AppSidebarLayoutProps = {
  children?: ReactNode
}

function SidebarLogo() {
  const { state } = useSidebar()
  return (
    <span className="truncate font-semibold">
      {state === "collapsed" ? "SL" : "Sina Leather"}
    </span>
  )
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsPending(true)
    changePassword({ currentPassword, newPassword })
      .then(() => {
        setSuccess("Password changed successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsPending(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-green-600 text-sm" role="status">
              {success}
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Change Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UserMenu() {
  const { data: session } = useAuthSession()
  const navigate = useNavigate()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const handleLogout = () => {
    clearAuthSession()
    queryClient.setQueryData(["auth", "session"], null)
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex flex-col gap-2">
      <Separator className="bg-sidebar-border" />
      <div className="flex items-center gap-2 px-2 py-1">
        <UserIcon className="size-4 shrink-0 text-sidebar-foreground/70" />
        <span className="truncate text-sm text-sidebar-foreground">
          {session?.email ?? "User"}
        </span>
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Change password"
            onClick={() => setChangePasswordOpen(true)}
          >
            <KeyRound />
            <span>Change password</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="Log out" onClick={handleLogout}>
            <LogOutIcon />
            <span>Log out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
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
                  <SidebarLogo />
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
