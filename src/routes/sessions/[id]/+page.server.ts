import { error } from '@sveltejs/kit';
import { fetchLabWorker } from '$lib/server/lab-worker';
import type { PageServerLoad } from './$types';

type LabSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  artifact: {
    repo: string;
    branch?: string;
    head?: string;
    remote?: string;
  };
  receiptIds: string[];
  summary?: {
    goal?: string;
    state?: string;
    nextAction?: string;
    risks?: string[];
    importantReceiptIds?: string[];
    updatedByReceiptId?: string;
    updatedAt: string;
  };
};

type ReceiptSummary = {
  id: string;
  type: string;
  outcome?: { ok?: boolean };
  artifact?: { head?: string };
  receipt?: {
    source?: string;
    action?: string;
  };
};

export const load: PageServerLoad = async ({ params, platform }) => {
  const response = await fetchLabWorker(platform, `/sessions/${params.id}`);
  if (!response.ok) error(404, `Session ${params.id} not found`);
  const data = (await response.json()) as { session: LabSession };
  const session = data.session;
  const receipts = await Promise.all(
    (session.receiptIds ?? []).map(async (id: string) => {
      const receipt = await fetchLabWorker(platform, `/results/${id}.json`);
      return receipt.ok ? ((await receipt.json()) as ReceiptSummary) : null;
    }),
  );
  return {
    session,
    receipts: receipts.filter((receipt): receipt is ReceiptSummary => Boolean(receipt)),
  };
};
