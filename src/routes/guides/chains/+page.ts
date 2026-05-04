import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(308, '/docs/http-api#post-runchain');
}
