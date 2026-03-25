<script lang="ts">
  import { dev } from '$app/environment';

  const baseUrl = dev ? 'http://localhost:5173' : 'https://lab.coey.dev';

  interface Props {
    title: string;
    description: string;
    path: string;
    keywords?: string;
    type?: 'article' | 'website';
    section?: string;
    tags?: string;
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
  }

  let {
    title,
    description,
    path,
    keywords = '',
    type = 'website',
    section = '',
    tags = '',
    publishedTime = '',
    modifiedTime = '',
    author = 'lab.coey.dev',
  }: Props = $props();

  const canonical = $derived(`${baseUrl}${path}`);
  const ogImageUrl = $derived(
    `${baseUrl}/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if keywords}<meta name="keywords" content={keywords} />{/if}
  <link rel="canonical" href={canonical} />
  <meta name="author" content={author} />

  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content={type} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={ogImageUrl} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageUrl} />

  {#if type === 'article'}
    {#if publishedTime}
      <meta property="article:published_time" content={publishedTime} />
    {/if}
    {#if modifiedTime}
      <meta property="article:modified_time" content={modifiedTime} />
    {/if}
    {#if section}
      <meta property="article:section" content={section} />
    {/if}
    {#if tags}
      <meta property="article:tag" content={tags} />
    {/if}
  {/if}
</svelte:head>

