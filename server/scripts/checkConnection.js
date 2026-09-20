import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const clientEnvPath = resolve(process.cwd(), "../client/.env");
const clientEnv = existsSync(clientEnvPath)
  ? parse(readFileSync(clientEnvPath))
  : {};
const required = {
  "client/.env": ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"],
  "server/.env": [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
  ],
};
const serverEnv = process.env;
const missing = Object.entries(required).flatMap(([file, names]) =>
  names
    .filter((name) => !(file === "client/.env" ? clientEnv : serverEnv)[name])
    .map((name) => `${file}: ${name}`),
);

if (missing.length) {
  console.error(`Missing configuration:\n${missing.join("\n")}`);
  process.exitCode = 1;
} else if (
  clientEnv.VITE_SUPABASE_URL !== serverEnv.SUPABASE_URL ||
  clientEnv.VITE_SUPABASE_PUBLISHABLE_KEY !== serverEnv.SUPABASE_PUBLISHABLE_KEY
) {
  console.error("Client and server Supabase project settings do not match.");
  process.exitCode = 1;
} else if (
  Object.values(clientEnv).some((value) =>
    /your-project|your_publishable_key/i.test(value),
  ) ||
  [serverEnv.DATABASE_URL, serverEnv.DIRECT_URL].some((value) =>
    /PROJECT_REF|\[YOUR-PASSWORD\]|:PASSWORD@|@HOST:/i.test(value),
  )
) {
  console.error("Replace the example placeholders in both .env files.");
  process.exitCode = 1;
} else {
  try {
    const url = new URL(serverEnv.SUPABASE_URL);
    if (url.protocol !== "https:") throw new Error("Invalid Supabase URL.");
    for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
      const databaseUrl = new URL(serverEnv[name]);
      if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol))
        throw new Error(`Invalid ${name}.`);
    }

    const response = await fetch(new URL("/auth/v1/health", url), {
      headers: { apikey: serverEnv.SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(`Supabase Auth returned HTTP ${response.status}.`);
    console.log("Supabase Auth: reachable");

    const { prisma } = await import("../src/lib/prisma.js");
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("Supabase PostgreSQL: connected");
      const destinationCount = await prisma.destination.count();
      console.log(`Destination records: ${destinationCount}`);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    // Database errors can contain connection-string details; never print them.
    console.error(
      error.message?.startsWith("Supabase Auth returned") ||
        error.message?.startsWith("Invalid ")
        ? error.message
        : "Connection check failed. Verify the project URL, database connection strings, TLS, and network access.",
    );
    process.exitCode = 1;
  }
}
