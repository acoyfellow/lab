import { denyMessageFor } from "../capabilities/registry"

/** Versioned guest shell ids. Only `guest@v1` is implemented (WorkerEntrypoint-style module with inserted body). */
export const GUEST_TEMPLATE_IDS = ["guest@v1"] as const

export type GuestTemplateId = (typeof GUEST_TEMPLATE_IDS)[number]

export const GUEST_TEMPLATE_DEFAULT: GuestTemplateId = "guest@v1"

export function resolveGuestTemplateId(raw: string | undefined): GuestTemplateId | null {
  const id = (raw?.trim() || GUEST_TEMPLATE_DEFAULT) as string
  return (GUEST_TEMPLATE_IDS as readonly string[]).includes(id) ? (id as GuestTemplateId) : null
}

/**
 * Emits the dynamic Worker `main.js` module: default export with `fetch` running user `body`
 * inside an async IIFE, plus capability shims.
 */
export function composeGuestModule(
  templateId: GuestTemplateId,
  body: string,
  caps: import("../Capability").CapabilitySet | undefined,
  kvSnapshot?: Record<string, string | null>,
  kvKeys?: string[],
  input?: unknown,
): string {
  if (templateId !== "guest@v1") {
    throw new Error(`unsupported guest template: ${templateId}`)
  }

  const kvDeny = denyMessageFor("kvRead")
  const spawnDeny = denyMessageFor("spawn")
  const aiDeny = denyMessageFor("workersAi")
  const r2Deny = denyMessageFor("r2Read")
  const d1Deny = denyMessageFor("d1Read")
  const doDeny = denyMessageFor("durableObjectFetch")
  const contDeny = denyMessageFor("containerHttp")

  const kvShim = caps?.kvRead
    ? `
    const __kvData = ${JSON.stringify(kvSnapshot ?? {})};
    const __kvKeys = ${JSON.stringify(kvKeys ?? [])};
    const kv = {
      async get(key) { return __kvData[key] ?? null; },
      async list(prefix) {
        if (!prefix) return __kvKeys;
        return __kvKeys.filter(k => k.startsWith(prefix));
      }
    };
`
    : `
    const kv = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(kvDeny)}); }
    });
`

  const inputShim = input !== undefined ? `const input = ${JSON.stringify(input)};` : ``

  const spawnDepth = caps?.spawn?.depth ?? 0
  const spawnShim =
    caps?.spawn && spawnDepth > 0
      ? `
    const spawn = async (code, caps) => {
      const res = await fetch("http://internal/spawn/child", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: code, capabilities: caps || [], depth: ${spawnDepth - 1}, template: "${GUEST_TEMPLATE_DEFAULT}" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "spawn failed");
      return data.result;
    };
`
      : `
    const spawn = () => { throw new Error(${JSON.stringify(spawnDeny)}); };
`

  const aiShim = caps?.workersAi
    ? `
    const ai = {
      async run(prompt) {
        const res = await fetch("http://internal/invoke/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke ai failed");
        return data.result;
      }
    };
`
    : `
    const ai = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(aiDeny)}); }
    });
`

  const r2Shim = caps?.r2Read
    ? `
    const r2 = {
      async list(prefix, limit) {
        const res = await fetch("http://internal/invoke/r2", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "list", prefix: prefix ?? null, limit: limit ?? 500 }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke r2 failed");
        return data.result;
      },
      async getText(key, maxBytes) {
        const res = await fetch("http://internal/invoke/r2", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "getText", key, maxBytes: maxBytes ?? 262144 }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke r2 failed");
        return data.result;
      }
    };
`
    : `
    const r2 = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(r2Deny)}); }
    });
`

  const d1Shim = caps?.d1Read
    ? `
    const d1 = {
      async query(sql) {
        const res = await fetch("http://internal/invoke/d1", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sql }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke d1 failed");
        return data.result;
      }
    };
`
    : `
    const d1 = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(d1Deny)}); }
    });
`

  const doShim = caps?.durableObjectFetch
    ? `
    const labDo = {
      async fetch(name, rpc) {
        const method = rpc?.method;
        const path = (typeof rpc?.path === "string" && rpc.path.trim()) ? rpc.path : "/";
        const res = await fetch("http://internal/invoke/do", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, method, path, body: rpc?.body }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke do failed");
        return data.result;
      }
    };
`
    : `
    const labDo = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(doDeny)}); }
    });
`

  const contShim = caps?.containerHttp
    ? `
    const labContainer = {
      async get(path) {
        const res = await fetch("http://internal/invoke/container", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: path ?? "/" }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke container failed");
        return data.result;
      }
    };
`
    : `
    const labContainer = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(contDeny)}); }
    });
`

  const petriShim = caps?.petri
    ? `
    const labPetri = {
      async mutate(mutations) {
        const dishId = input?.dishId;
        if (!dishId) throw new Error("petri: dishId required in input");
        const res = await fetch("http://internal/invoke/petri", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dishId, mutations }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "petri mutate failed");
        return data.snapshot;
      },
      async getState() {
        const dishId = input?.dishId;
        if (!dishId) throw new Error("petri: dishId required in input");
        const res = await fetch("http://internal/invoke/petri/snapshot?dishId=" + encodeURIComponent(dishId));
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "petri getState failed");
        return data.state;
      }
    };
`
    : `
    const labPetri = new Proxy({}, {
      get() { throw new Error("petri capability not granted"); }
    });
`

  return `
export default {
  async fetch(req, env) {
    try {
      ${inputShim}
      ${kvShim}
      ${spawnShim}
      ${aiShim}
      ${r2Shim}
      ${d1Shim}
      ${doShim}
      ${contShim}
      ${petriShim}
      const __result = await (async () => {
        ${body}
      })();
      return Response.json({ ok: true, result: __result ?? null });
    } catch (e) {
      return Response.json({ ok: false, error: e.message }, { status: 500 });
    }
  }
};
`
}
