#!/usr/bin/env bun
/**
 * Frees ports used by `alchemy dev` (Vite + lab-worker) so restarts don't
 * bounce to 1338 or collide with a stale process.
 */
const ports = [5173, 1337, 1338, 1339, 1340]

function pidsOnPort(port: number): string[] {
  const r = Bun.spawnSync(["lsof", "-ti", `:${port}`], {
    stdout: "pipe",
    stderr: "pipe",
  })
  if (r.exitCode !== 0) return []
  const out = new TextDecoder().decode(r.stdout).trim()
  if (!out) return []
  return out.split(/\s+/).filter(Boolean)
}

let killed = 0
for (const port of ports) {
  for (const pid of pidsOnPort(port)) {
    Bun.spawnSync(["kill", "-9", pid])
    console.log(`[kill-dev-ports] freed :${port} (pid ${pid})`)
    killed++
  }
}

if (killed === 0) {
  console.log("[kill-dev-ports] nothing listening on dev ports")
}
