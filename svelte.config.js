import alchemy from 'alchemy/cloudflare/sveltekit';
import adapter from '@sveltejs/adapter-cloudflare';
import { mdsvex } from 'mdsvex';
import remarkGfm from 'remark-gfm';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'fs';

const dev = process.env.NODE_ENV === 'development';
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

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
		version: { name: pkg.version },
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
