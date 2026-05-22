import { useState } from "react"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm, type SubmitHandler } from "react-hook-form"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button.tsx"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { useQueryClient } from "@tanstack/react-query"
import { login } from "@/lib/auth.ts"
import { loginSchema, type LoginFormValues } from "@/lib/auth-schemas.ts"

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  })

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    try {
      setServerError(null)
      const user = await login({
        identifier: data.identifier,
        password: data.password,
      })

      queryClient.setQueryData(["auth", "session"], user)
      navigate("/", { replace: true })
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to sign in"
      )
    }
  }

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in with your email or phone number.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="flex flex-col gap-4 pt-6">
          {serverError ? (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="login-identifier">Email or Phone</Label>
            <Input
              id="login-identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com or +2519..."
              aria-invalid={Boolean(errors.identifier)}
              {...register("identifier")}
            />
            {errors.identifier ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.identifier.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t bg-transparent pt-6">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
