import alchemy from "alchemy";

import {
  SvelteKit,
  Worker,
  D1Database,
  KVNamespace,
  WorkerLoader,
  Ai,
  Self,
  R2Bucket,
  DurableObjectNamespace,
} from "alchemy/cloudflare";

import { CloudflareStateStore, FileSystemStateStore } from "alchemy/state";

const projectName = "lab";

const project = await alchemy(projectName, {
  password: process.env.ALCHEMY_PASSWORD!,
  stateStore: (scope) => scope.local 
    ? new FileSystemStateStore(scope) 
    : new CloudflareStateStore(scope, {
      scriptName: `${projectName}-app-state`,
      apiToken: alchemy.secret(process.env.CLOUDFLARE_API_TOKEN || ""),
      stateToken: alchemy.secret(process.env.ALCHEMY_STATE_TOKEN || ""),
      forceUpdate: true
    })
});

// KV namespace for traces + demo data
const KV = await KVNamespace(`${projectName}-kv`);

// D1 database for Better Auth
const DB = await D1Database(`${projectName}-db`, {
  name: `${projectName}-db`,
  migrationsDir: "migrations",
  adopt: true,
});

// Engine D1 for guest read demos (isolate worker only)
const ENGINE_D1 = await D1Database(`${projectName}-engine-d1`, {
  name: `${projectName}-engine-d1`,
  migrationsDir: "worker/d1-migrations",
  adopt: true,
});

const R2 = await R2Bucket(`${projectName}-r2`);

const LAB_DO = DurableObjectNamespace("lab-stub-do", {
  className: "LabStubDurableObject",
});

// Petri Dish Durable Object for persistent experiment substrate
const PETRI_DO = DurableObjectNamespace("petri-dish", {
  className: "PetriDish",
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
    R2,
    ENGINE_D1,
    LAB_DO,
    PETRI_DO,
  },
  url: false,
  // Same port as SvelteKit dev proxy (`data.remote.ts`) and `@acoyfellow/lab` local dogfood (`LAB_URL`).
  dev: {
    port: 1337,
  },
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
