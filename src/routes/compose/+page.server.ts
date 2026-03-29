import type { PageServerLoad } from './$types';
import { getLabCapabilities } from '$lib/server/lab-capabilities';

export const load: PageServerLoad = async () => ({
  capabilities: getLabCapabilities(),
});
