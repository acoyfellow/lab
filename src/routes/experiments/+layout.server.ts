import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    experimentAuth: {
      authenticated: !!locals.user,
      user: locals.user,
    },
  };
};
