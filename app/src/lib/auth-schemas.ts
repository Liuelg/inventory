import * as yup from "yup"

export const loginSchema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
})

export type LoginFormValues = yup.InferType<typeof loginSchema>

export const signupSchema = yup.object({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email("Enter a valid email address")
    .required("Email is required"),
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
