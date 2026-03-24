import alchemy from "alchemy";

import {
  SvelteKit,
  Worker,
  D1Database,
  KVNamespace,
} from "alchemy/cloudflare";

const projectName = "lab";

const project = await alchemy(projectName, {
  password: process.env.ALCHEMY_PASSWORD || "default-password"
});

// KV namespace for traces + demo data (carried over from existing worker)
const KV = await KVNamespace(`${projectName}-kv`);

// Create D1 database for auth (required for Better Auth)
const DB = await D1Database(`${projectName}-db`, {
  migrationsDir: "migrations",
  adopt: true,
});

// Create the worker that hosts the isolate engine
// Note: worker_loaders, AI, and SELF bindings may need manual wrangler config
export const WORKER = await Worker(`${projectName}-worker`, {
  entrypoint: "./worker/index.ts",
  adopt: true,
  bindings: {
    KV,
  },
  url: false,
});

// Create the SvelteKit app
export const APP = await SvelteKit(`${projectName}-app`, {
  bindings: {
    WORKER,
    DB,
    KV,
  },
  url: true,
  adopt: true,
  env: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "85000968f86b5d30510b5b73186b914c430f8e1573614a6d75ed4cc53383517a",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:5173",
  }
});

await project.finalize();
