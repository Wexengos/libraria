import { Injectable } from '@nestjs/common'

@Injectable()
export class MediaCacheService {
  private readonly entries = new Map<string, { expiresAt: number; value: unknown }>()

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const current = this.entries.get(key)
    if (current && current.expiresAt > Date.now()) return current.value as T
    if (current) this.entries.delete(key)
    const value = await load()
    this.set(key, value, ttlMs)
    if (this.entries.size > 500) {
      const oldestKey = this.entries.keys().next().value
      if (oldestKey) this.entries.delete(oldestKey)
    }
    return value
  }
}
