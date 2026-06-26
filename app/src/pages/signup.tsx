import { useState } from "react"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm, type SubmitHandler } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx"
import { useQueryClient } from "@tanstack/react-query"
import { register as registerUser } from "@/lib/auth.ts"
import { useStores } from "@/features/stores/hooks"
import {
  type SignupFormValues,
  signupSchema,
} from "@/lib/auth-schemas.ts"

export function SignupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: stores } = useStores()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: yupResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "stock",
      store: "",
    },
  })

  const selectedRole = watch("role")

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    try {
      setServerError(null)
      const user = await registerUser({
        email: data.email || undefined,
        password: data.password,
        name: data.name,
        role: data.role,
        store: data.role === "sales" ? data.store : undefined,
      })

      queryClient.setQueryData(["auth", "session"], user)
      navigate("/", { replace: true })
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to create account"
      )
    }
  }

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your details below to create your account.
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
            <Label htmlFor="signup-name">Name</Label>
            <Input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signup-role">Role</Label>
            <Select
              value={watch("role") || "stock"}
              onValueChange={(v) => setValue("role", v as "admin" | "sales" | "stock", { shouldValidate: true })}
            >
              <SelectTrigger id="signup-role" aria-invalid={Boolean(errors.role)}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales">Sales (Store)</SelectItem>
                <SelectItem value="stock">Stock (Warehouse)</SelectItem>
              </SelectContent>
            </Select>
            {errors.role ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.role.message}
              </p>
            ) : null}
          </div>
          {selectedRole === "sales" ? (
            <div className="grid gap-2">
              <Label htmlFor="signup-store">Store</Label>
              <Select
                value={watch("store") || ""}
                onValueChange={(v) => setValue("store", v, { shouldValidate: true })}
              >
                <SelectTrigger id="signup-store" aria-invalid={Boolean(errors.store)}>
                  <SelectValue placeholder="Select your store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.store ? (
                <p className="text-destructive text-sm" role="alert">
                  {errors.store.message}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="signup-email">Email (optional)</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signup-password-confirm">Confirm password</Label>
            <Input
              id="signup-password-confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-destructive text-sm" role="alert">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t bg-transparent pt-6">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
