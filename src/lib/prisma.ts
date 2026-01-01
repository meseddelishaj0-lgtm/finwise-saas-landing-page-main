import { PrismaClient } from '@/generated/prisma/client/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// Enable fetch-based queries for Vercel Edge / serverless environments
neonConfig.poolQueryViaFetch = true
// Disable connection caching to ensure fresh reads
neonConfig.fetchConnectionCache = false

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

