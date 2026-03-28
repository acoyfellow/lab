import type { User, Session } from 'better-auth';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
		interface Platform {
			env?: {
				DB: D1Database;
				KV: KVNamespace;
				WORKER: Fetcher;
				BETTER_AUTH_SECRET?: string;
				BETTER_AUTH_URL?: string;
				GH_CLIENT_ID?: string;
				GH_CLIENT_SECRET?: string;
			};
		}
	}
}

export {};
