import { betterAuth } from 'better-auth';
import type { Auth, BetterAuthOptions } from 'better-auth';
import { sveltekitCookies } from "better-auth/svelte-kit";
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { user, session, account, verification } from './schema';
import { getRequestEvent } from '$app/server';

import type { D1Database } from '@cloudflare/workers-types';

let drizzleInstance: ReturnType<typeof drizzle> | null = null;

// Cache auth instances per origin so multiple origins work in the same isolate.
// better-auth 1.6+ infers a narrow `Auth<T>` from the literal config, but the
// cache stores the widened `Auth<BetterAuthOptions>` shape downstream consumers
// expect. The cast at insertion is safe — all callers treat the cached value
// through the generic-auth surface, not the narrow inferred config.
type CachedAuth = Auth<BetterAuthOptions>;
const authInstances = new Map<string, CachedAuth>();

export function getDrizzle(): ReturnType<typeof drizzle> {
  if (!drizzleInstance) {
    throw new Error('Database not initialized. Call initAuth() first.');
  }
  return drizzleInstance;
}

export function initAuth(db: D1Database, env: any, baseURL: string) {
  if (!db) {
    throw new Error('D1 database is required for Better Auth');
  }

  if (!baseURL) {
    throw new Error("baseURL is required for Better Auth");
  }

  if (!drizzleInstance) {
    drizzleInstance = drizzle(db, {
      schema: {
        user,
        session,
        account,
        verification,
      },
    });
  }

  const existing = authInstances.get(baseURL);
  if (existing) return existing;

  const instance = betterAuth({
    trustedOrigins: [
      "http://localhost:5173",
      "https://lab.coey.dev",
    ],
    database: drizzleAdapter(drizzleInstance, {
      provider: 'sqlite',
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    socialProviders: {
      github: {
        clientId: env?.GH_CLIENT_ID || '',
        clientSecret: env?.GH_CLIENT_SECRET || '',
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    secret: env?.BETTER_AUTH_SECRET || (() => {
      throw new Error('BETTER_AUTH_SECRET environment variable is required');
    })(),
    baseURL,
    plugins: [sveltekitCookies(getRequestEvent as any)],
  });

  authInstances.set(baseURL, instance as unknown as CachedAuth);
  return instance;
}
