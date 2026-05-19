import { useQuery } from "@tanstack/react-query"

import {
  clearAuthSession,
  fetchCurrentUser,
  getAuthToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth"

export function useAuthSession() {
  return useQuery<AuthUser | null>({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      if (!getAuthToken()) {
        return null
      }

      try {
        return await fetchCurrentUser()
      } catch {
        clearAuthSession()
        return null
      }
    },
    initialData: () => {
      if (!getAuthToken()) {
        return null
      }

      return getStoredUser()
    },
    retry: false,
  })
}
