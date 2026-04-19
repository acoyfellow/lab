<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import { listStories } from '../data.remote';

  type StoryView = {
    id: string;
    title: string;
    createdAt: string;
    createdBy?: string;
    status: string;
    visibility: string;
    tags?: string[];
  };

  let stories = $state<StoryView[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let statusFilter = $state('');

  async function load() {
    loading = true;
    error = null;
    try {
      const options: Record<string, unknown> = {};
      if (statusFilter) options.status = statusFilter;
      const r = await listStories(options);
      if (!r.ok) {
        error = r.error ?? 'Failed to load stories';
        stories = [];
      } else {
        stories = r.stories ?? [];
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      stories = [];
    } finally {
      loading = false;
    }
  }

  onMount(load);

  const statusColors: Record<string, string> = {
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    approved: 'bg-purple-100 text-purple-800',
  };
</script>

<SEO
  title="Stories — lab"
  description="Browse and explore debugging stories composed from execution traces."
  path="/stories"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-6">
  <header class="space-y-1">
    <h1 class="text-lg font-semibold tracking-tight">Stories</h1>
    <p class="text-[0.8125rem] text-(--text-2)">
      Debugging narratives composed from execution traces. Each chapter is a trace with AI-generated summaries.
    </p>
  </header>

  <div class="flex items-center gap-3">
    <select
      bind:value={statusFilter}
      onchange={load}
      class="border border-(--border) rounded-(--radius) bg-white px-3 py-2 text-[0.8125rem]"
    >
      <option value="">All statuses</option>
      <option value="in-progress">In progress</option>
      <option value="completed">Completed</option>
      <option value="failed">Failed</option>
      <option value="approved">Approved</option>
    </select>
  </div>

  {#if loading}
    <p class="text-[0.8125rem] text-(--text-3)">Loading stories...</p>
  {:else if error}
    <div class="rounded-(--radius) border border-red-200 bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800">
      {error}
    </div>
  {:else if stories.length === 0}
    <p class="text-[0.8125rem] text-(--text-3)">No stories found. Create one from the Compose page after running a trace.</p>
  {:else}
    <div class="space-y-3">
      {#each stories as story}
        <a
          href="/stories/{story.id}"
          class="block rounded-(--radius) border border-(--border) bg-white p-4 hover:border-(--accent) transition-colors"
        >
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-[0.875rem] font-medium">{story.title}</h2>
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium {statusColors[story.status] ?? 'bg-gray-100 text-gray-800'}">
              {story.status}
            </span>
          </div>
          <div class="text-[0.75rem] text-(--text-3) space-x-3">
            <span>{new Date(story.createdAt).toLocaleDateString()}</span>
            {#if story.createdBy}
              <span>by {story.createdBy}</span>
            {/if}
            <span class="uppercase">{story.visibility}</span>
          </div>
          {#if story.tags?.length}
            <div class="flex gap-1.5 mt-2">
              {#each story.tags as tag}
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] bg-(--surface-alt) text-(--text-3)">
                  {tag}
                </span>
              {/each}
            </div>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</div>
