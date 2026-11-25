import type { User } from '@supabase/supabase-js'

export type AuthenticatedRequest = {
  headers: { authorization?: string }
  user?: User
}
