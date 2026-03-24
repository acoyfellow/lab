/**
 * Smoke-test `@acoyfellow/lab` against a running lab Worker.
 *
 * Run `bun dev` (alchemy) first so the isolate worker is on LAB_URL (default http://localhost:1337).
 */
import { createLabClient } from "@acoyfellow/lab";

const baseUrl = process.env.LAB_URL ?? "http://localhost:1337";
const lab = createLabClient({ baseUrl });

const out = await lab.runSandbox("return { ok: true, sum: 1 + 2 }");
if (!out.ok) {
  console.error("runSandbox failed:", out);
  process.exit(1);
}
console.log("dogfood @acoyfellow/lab OK", baseUrl, out.result);
