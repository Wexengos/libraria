type DatabasePrefix = 'DATABASE' | 'DIRECT_DATABASE'
type DatabasePart = 'HOST' | 'PORT' | 'NAME' | 'USER' | 'PASSWORD'

export function getDatabaseUrl(prefix: DatabasePrefix = 'DATABASE'): string | undefined {
  const readPart = (part: DatabasePart) => {
    const configured = process.env[`${prefix}_${part}`]
    return configured || (prefix === 'DIRECT_DATABASE' ? process.env[`DATABASE_${part}`] : undefined)
  }

  const parts = {
    host: readPart('HOST'),
    port: readPart('PORT'),
    name: readPart('NAME'),
    user: readPart('USER'),
    password: readPart('PASSWORD'),
  }

  if (Object.values(parts).every((value) => !value)) return undefined

  const missing = Object.entries(parts)
    .filter(([, value]) => !value)
    .map(([key]) => key.toUpperCase())

  if (missing.length > 0) {
    throw new Error(`Missing database configuration: ${missing.join(', ')}`)
  }

  const port = Number(parts.port)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${prefix}_PORT must be a valid TCP port`)
  }

  const host = parts.host!.includes(':') && !parts.host!.startsWith('[')
    ? `[${parts.host}]`
    : parts.host!
  const url = new URL(`postgresql://${host}:${port}/${encodeURIComponent(parts.name!)}`)
  url.username = parts.user!
  url.password = parts.password!
  return url.toString()
}
