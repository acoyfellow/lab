import alchemy from 'alchemy/cloudflare/sveltekit';
import adapter from '@sveltejs/adapter-cloudflare';
import { mdsvex } from 'mdsvex';
import remarkGfm from 'remark-gfm';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx', '.svelte.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md', '.svx', '.svelte.md'],
			remarkPlugins: [remarkGfm],
		}),
	],
	kit: {
		adapter: dev ? alchemy() : adapter(),
    experimental: {
			remoteFunctions: true
		}
  },
  compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
