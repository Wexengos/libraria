import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient | null

  constructor() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY
    this.supabase = url && key
      ? createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        })
      : null
  }

  async verifyAccessToken(token: string): Promise<User> {
    if (!this.supabase) {
      throw new ServiceUnavailableException('Supabase Auth is not configured.')
    }

    try {
      const { data, error } = await this.supabase.auth.getUser(token)
      if (error || !data.user) {
        if (error?.status && error.status >= 500) {
          throw new ServiceUnavailableException('Supabase Auth is temporarily unavailable.')
        }
        throw new UnauthorizedException('The access token is invalid or expired.')
      }
      return data.user
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error
      throw new ServiceUnavailableException('Could not reach Supabase Auth.')
    }
  }
}
