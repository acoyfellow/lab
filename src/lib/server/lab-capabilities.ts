import { CAPABILITY_REGISTRY, type LabCapabilityId } from '../../../worker/capabilities/registry';

export type CapabilityView = {
  id: LabCapabilityId;
  label: LabCapabilityId;
  binding: string;
  summary: string;
  denyMessage: string;
  experimental: boolean;
};

type CapabilityDoc = {
  canDo: string;
  denied: string;
  experimental?: boolean;
};

const docsById: Record<LabCapabilityId, CapabilityDoc> = {
  kvRead: {
    canDo: 'Read from KV storage (`kv.get`, `kv.list`).',
    denied: 'KvRead capability not granted',
  },
  spawn: {
    canDo: 'Launch nested sandboxes (`spawn(code, caps)`) with the same or fewer capabilities.',
    denied: 'Spawn capability not granted',
  },
  workersAi: {
    canDo: 'Call Cloudflare AI models (`ai.run(prompt)`).',
    denied: 'WorkersAi capability not granted',
  },
  r2Read: {
    canDo: 'Read files from R2 storage (`r2.list`, `r2.getText`).',
    denied: 'R2Read capability not granted',
  },
  d1Read: {
    canDo: 'Query the guest-readable engine D1 database in read-only mode (`d1.query(sql)`).',
    denied: 'D1Read capability not granted',
  },
  durableObjectFetch: {
    canDo: 'Call a Durable Object (`labDo.fetch(name, opts)`).',
    denied: 'DurableObjectFetch capability not granted',
  },
  containerHttp: {
    canDo: 'Call the configured container binding over HTTP (`labContainer.get(path)`).',
    denied: 'ContainerHttp capability not granted',
  },
  petri: {
    canDo: 'Mutate and read a Petri dish (`labPetri.mutate`, `labPetri.getState`).',
    denied: 'Petri capability not granted',
    experimental: true,
  },
};

export function getLabCapabilities(): CapabilityView[] {
  return CAPABILITY_REGISTRY.map((cap) => ({
    id: cap.id,
    label: cap.id,
    binding: cap.binding,
    summary: docsById[cap.id].canDo,
    denyMessage: docsById[cap.id].denied,
    experimental: docsById[cap.id].experimental ?? false,
  }));
}
