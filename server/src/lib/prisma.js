import { PrismaClient } from "@prisma/client";

// Use the configured connection string unchanged. Supabase connections should
// retain sslmode=require; never silently downgrade TLS on Windows.
const createPrismaClient = () => new PrismaClient();

// Reuse the client when a warm serverless instance handles another request.
// This prevents avoidable PostgreSQL connections during Vercel invocations.
export const prisma = globalThis.__smarttripPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__smarttripPrisma = prisma;
}
