import { PrismaClient } from '@prisma/client';

// Prisma's Windows query engine can fail against the Supabase pooler before
// certificate verification (Schannel SEC_E_NO_CREDENTIALS). Keep production
// TLS unchanged, but use the pooler's local-development connection on Windows.
const configuredUrl = process.env.DATABASE_URL;
const localWindowsUrl = process.platform === 'win32' && configuredUrl
  ? configuredUrl.replace(/sslmode=(?:require|no-verify)/, 'sslmode=disable')
  : configuredUrl;

const createPrismaClient = () =>
  new PrismaClient(
    localWindowsUrl
      ? { datasources: { db: { url: localWindowsUrl } } }
      : undefined,
  );

// Reuse the client when a warm serverless instance handles another request.
// This prevents avoidable PostgreSQL connections during Vercel invocations.
export const prisma = globalThis.__smarttripPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__smarttripPrisma = prisma;
}
