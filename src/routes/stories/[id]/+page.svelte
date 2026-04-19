<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import { Button } from '$lib/components/ui/button';
  import { getStory, forkStory } from '../../data.remote';
  import { page } from '$app/state';

  type Chapter = {
    id: string;
    chapterIndex: number;
    traceId: string;
    title?: string;
    summary?: string;
    decisionPoint?: {
      question: string;
      options: string[];
      chosen: number;
      reasoning: string;
    };
  };

  type Story = {
    id: string;
    title: string;
    createdAt: string;
    createdBy?: string;
    status: string;
    visibility: string;
    tags?: string[];
    chapters?: Chapter[];
  };

  let story = $state<Story | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let forking = $state(false);
  let forkIndex = $state<number | null>(null);

  const storyId = $derived(page.params.id ?? '');

  async function load() {
    loading = true;
    error = null;
    try {
      const r = await getStory(storyId);
      if (!r.ok || !r.story) {
        error = r.error ?? 'Story not found';
      } else {
        story = r.story;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function handleFork(chapterIndex: number) {
    if (!story) return;
    forking = true;
    forkIndex = chapterIndex;
    try {
      const r = await forkStory({
        storyId: story.id,
        fromChapterIndex: chapterIndex,
      });
      if (r.ok && r.story) {
        window.location.href = `/stories/${r.story.id}`;
      } else {
        error = r.error ?? 'Fork failed';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      forking = false;
      forkIndex = null;
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
  title="{story?.title ?? 'Story'} — lab"
  description="Story detail with chapters and trace summaries."
  path="/stories/{storyId}"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-6">
  {#if loading}
    <p class="text-[0.8125rem] text-(--text-3)">Loading story...</p>
  {:else if error}
    <div class="rounded-(--radius) border border-red-200 bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800">
      {error}
    </div>
  {:else if story}
    <header class="space-y-2">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold tracking-tight">{story.title}</h1>
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
        <div class="flex gap-1.5">
          {#each story.tags as tag}
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] bg-(--surface-alt) text-(--text-3)">
              {tag}
            </span>
          {/each}
        </div>
      {/if}
    </header>

    <!-- Timeline -->
    {#if story.chapters && story.chapters.length > 0}
      <div class="space-y-0">
        {#each story.chapters as chapter, i}
          <div class="relative pl-8 pb-6 {i < story.chapters!.length - 1 ? 'border-l-2 border-(--border)' : ''}">
            <!-- Timeline dot -->
            <div class="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-(--accent) border-2 border-white"></div>

            <div class="rounded-(--radius) border border-(--border) bg-white p-4 space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="text-[0.8125rem] font-medium">
                  {chapter.title ?? `Chapter ${chapter.chapterIndex + 1}`}
                </h3>
                <a
                  href="/results/{chapter.traceId}"
                  class="text-[0.6875rem] font-mono text-(--accent) hover:underline"
                >
                  {chapter.traceId}
                </a>
              </div>

              {#if chapter.summary}
                <p class="text-[0.75rem] text-(--text-2)">{chapter.summary}</p>
              {/if}

              {#if chapter.decisionPoint}
                <details class="text-[0.75rem]">
                  <summary class="cursor-pointer text-(--text-3) hover:text-(--text-2)">
                    Decision point
                  </summary>
                  <div class="mt-2 space-y-1 pl-2 border-l-2 border-(--border)">
                    <p class="font-medium text-(--text-2)">{chapter.decisionPoint.question}</p>
                    <div class="space-y-0.5">
                      {#each chapter.decisionPoint.options as opt, oi}
                        <p class={oi === chapter.decisionPoint.chosen ? 'text-(--accent) font-medium' : 'text-(--text-3)'}>
                          {oi === chapter.decisionPoint.chosen ? '→ ' : '  '}{opt}
                        </p>
                      {/each}
                    </div>
                    <p class="text-(--text-3) italic">{chapter.decisionPoint.reasoning}</p>
                  </div>
                </details>
              {/if}

              <div class="flex items-center gap-2 pt-1">
                <Button
                  onclick={() => handleFork(chapter.chapterIndex)}
                  disabled={forking}
                  variant="outline"
                  size="sm"
                  class="text-[0.6875rem]"
                >
                  {forking && forkIndex === chapter.chapterIndex ? 'Forking...' : 'Fork from here'}
                </Button>
                <a
                  href="/healing"
                  class="text-[0.6875rem] text-(--accent) hover:underline"
                  onclick={() => { sessionStorage.setItem('lab-heal-trace', chapter.traceId); }}
                >
                  Diagnose
                </a>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-[0.8125rem] text-(--text-3)">No chapters yet.</p>
    {/if}

    <a href="/stories" class="text-[0.75rem] text-(--accent) hover:underline">
      &larr; Back to stories
    </a>
  {/if}
</div>
