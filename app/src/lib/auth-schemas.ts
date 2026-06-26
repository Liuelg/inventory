import * as yup from "yup"

function isEmailOrPhone(value: string | undefined): boolean {
  if (!value) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^\+?[0-9\s\-]{7,20}$/
  return emailRegex.test(value) || phoneRegex.test(value)
}

export const loginSchema = yup.object({
  identifier: yup
    .string()
    .required("Email or phone is required")
    .test("is-email-or-phone", "Enter a valid email or phone number", isEmailOrPhone),
  password: yup.string().required("Password is required"),
})

export type LoginFormValues = yup.InferType<typeof loginSchema>

export const signupSchema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .default("")
    .test("email-or-empty", "Enter a valid email address", (value) => {
      if (!value) return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    }),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password")], "Passwords must match"),
  role: yup
    .string()
    .oneOf(["admin", "sales", "stock"], "Select a valid role")
    .required("Role is required"),
  store: yup
    .string()
    .default("")
    .when("role", {
      is: "sales",
      then: (schema) => schema.required("Store is required for sales users"),
      otherwise: (schema) => schema.optional(),
    }),
})

export type SignupFormValues = yup.InferType<typeof signupSchema>
