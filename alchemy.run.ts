import alchemy from "alchemy";

import {
  SvelteKit,
  Worker,
  D1Database,
  KVNamespace,
  WorkerLoader,
  Ai,
  Self,
} from "alchemy/cloudflare";

import { CloudflareStateStore, FileSystemStateStore } from "alchemy/state";

const projectName = "lab";

const project = await alchemy(projectName, {
  password: process.env.ALCHEMY_PASSWORD!,
  stateStore: (scope) => scope.local 
    ? new FileSystemStateStore(scope) 
    : new CloudflareStateStore(scope, {
      scriptName: `${projectName}-app-state`,
      apiToken: alchemy.secret(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY || ""),
      stateToken: alchemy.secret(process.env.ALCHEMY_STATE_TOKEN || ""),
      forceUpdate: true
    })
});

// KV namespace for traces + demo data
const KV = await KVNamespace(`${projectName}-kv`);

// D1 database for Better Auth
const DB = await D1Database(`${projectName}-db`, {
  migrationsDir: "migrations",
  adopt: true,
});

// Worker Loader for V8 isolate creation
const LOADER = WorkerLoader();

// Workers AI binding
const AI = Ai();

// Lab isolate engine worker
// SELF binding lets the worker call itself for spawn/child routes
export const WORKER = await Worker(`${projectName}-worker`, {
  entrypoint: "./worker/index.ts",
  adopt: true,
  compatibilityDate: "2025-06-01",
  compatibilityFlags: ["nodejs_compat"],
  bindings: {
    LOADER,
    KV,
    AI,
    SELF: Self,
  },
  url: false,
});

// SvelteKit app
export const APP = await SvelteKit(`${projectName}-app`, {
  bindings: {
    WORKER,
    DB,
    KV,
  },
  url: true,
  adopt: true,
  env: {
    BETTER_AUTH_SECRET: (() => {
      const secret = process.env.BETTER_AUTH_SECRET;
      if (!secret) throw new Error("BETTER_AUTH_SECRET environment variable is required for deployment");
      return secret;
    })(),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
  }
});

await project.finalize();
