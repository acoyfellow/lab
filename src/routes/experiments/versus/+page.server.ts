import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';

export type VersusGameRecord = {
	id: string;
	outcome: string;
	moves: number;
	result_ids: string;
	insight: string | null;
	created_at: string;
};

async function fetchVersusGames(platform: App.Platform | undefined): Promise<VersusGameRecord[]> {
	const body = JSON.stringify({
		name: 'versus',
		method: 'POST',
		path: '/sql/query',
		body: {
			sql: 'SELECT * FROM games ORDER BY created_at DESC LIMIT 20',
		},
	});

	let response: Response;
	if (dev) {
		response = await fetch('http://localhost:1337/invoke/do', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
		});
	} else {
		const worker = platform?.env?.WORKER;
		if (!worker) return [];
		response = await worker.fetch(
			new Request('http://worker/invoke/do', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
			}),
		);
	}

	const result = (await response.json()) as {
		ok?: boolean;
		result?: { rows?: Record<string, unknown>[] };
	};
	if (!response.ok || !result.ok) return [];
	return (result.result?.rows ?? []) as VersusGameRecord[];
}

export const load: PageServerLoad = async ({ platform }) => {
	const pastGames = await fetchVersusGames(platform);
	return { pastGames };
};
