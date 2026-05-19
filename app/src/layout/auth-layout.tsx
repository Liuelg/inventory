import type { ReactNode } from "react"
import { Link, Outlet } from "react-router-dom"

export type AuthLayoutProps = {
  children?: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-muted/30 flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-4 md:p-8">
        <Link
          to="/"
          className="text-foreground hover:text-foreground/80 text-lg font-semibold tracking-tight transition-colors"
        >
          App
        </Link>
        <div className="w-full max-w-md">
          {children ?? <Outlet />}
        </div>
      </div>
    </div>
  )
}
