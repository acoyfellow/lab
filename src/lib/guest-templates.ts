/**
 * UI / docs: allowed guest template ids. Keep in sync with `worker/guest/templates.ts` `GUEST_TEMPLATE_IDS`.
 */
export const GUEST_TEMPLATE_IDS = ['guest@v1'] as const;

export type GuestTemplateId = (typeof GUEST_TEMPLATE_IDS)[number];

export const GUEST_TEMPLATE_DEFAULT: GuestTemplateId = 'guest@v1';
