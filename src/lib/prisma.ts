import { PrismaClient } from '@/generated/prisma/client/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// Enable fetch-based queries for Vercel Edge / serverless environments
neonConfig.poolQueryViaFetch = true
// Disable connection caching to ensure fresh reads
neonConfig.fetchConnectionCache = false
// CRITICAL: Next.js patches global fetch and the Vercel Data Cache was CACHING
// the Neon driver's query POSTs, keyed by request body — so each distinct query
// shape returned its own frozen row snapshot (e.g. /api/stock-picks resolved a
// paying user as "free" from a days-old cached query result, while a differently
// shaped query in the same lambda saw fresh data). The cache persists across
// deployments, so `vercel --prod --force` does NOT clear it. Forcing
// `cache: 'no-store'` on the driver's fetch bypasses the Data Cache entirely.
neonConfig.fetchFunction = (url: any, init: any) =>
  fetch(url, { ...init, cache: 'no-store' })

// Use unpooled connection for direct reads (avoids read replica lag)
// Fall back to pooled if unpooled not available
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!

// Create adapter with connection string (NOT Pool for serverless)
const adapter = new PrismaNeon({ connectionString })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma

