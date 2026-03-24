import { redirect } from '@sveltejs/kit';
import { paths } from '$lib/paths';

export function load() {
	redirect(301, paths.docsTraceSchema);
}
