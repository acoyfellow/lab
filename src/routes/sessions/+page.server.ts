import { fetchLabWorker } from '$lib/server/lab-worker';
import type { PageServerLoad } from './$types';

type LabSession = {
  id: string;
  title: string;
  updatedAt: string;
  status: string;
  artifact: {
    repo: string;
    branch?: string;
    head?: string;
    remote?: string;
  };
  receiptIds: string[];
};

export const load: PageServerLoad = async ({ platform }) => {
  const response = await fetchLabWorker(platform, '/sessions');
  if (!response.ok) return { sessions: [] };
  const data = (await response.json()) as { sessions?: LabSession[] };
  return { sessions: data.sessions ?? [] };
};
