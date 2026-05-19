import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button.tsx"

export function NotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <Button asChild variant="outline">
        <Link to="/">Back to home</Link>
      </Button>
    </main>
  )
}
