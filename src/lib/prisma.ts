import { PrismaClient } from '@/generated/prisma/client/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// Use HTTP fetch-based queries for serverless (better for writes)
neonConfig.poolQueryViaFetch = true
neonConfig.fetchConnectionCache = true

// Use the pooler connection string
const connectionString = process.env.DATABASE_URL!

// Create a Pool for better connection management
const pool = new Pool({ connectionString })
const adapter = new PrismaNeon(pool)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma

