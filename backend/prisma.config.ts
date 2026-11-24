import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'
import { getDatabaseUrl } from './src/common/config/database-url.js'

dotenv.config({ path: '../.env' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: getDatabaseUrl('DIRECT_DATABASE') ?? '' },
})
