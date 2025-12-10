import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // Path to your Prisma schema file
  schema: 'prisma/schema.prisma',
  
  // Migration and seed configuration
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  
  // Database connection for Prisma CLI (migrations, studio, etc.)
  // Use the pooled connection string from Neon for best performance
  datasource: {
    url: env('DATABASE_URL'),
  },
})
