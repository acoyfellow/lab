<script lang="ts">
  type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

  type DiffEntry = {
    path: string;
    type: DiffType;
    oldValue?: unknown;
    newValue?: unknown;
  };

  type Props = {
    from: unknown;
    to: unknown;
    fromLabel?: string;
    toLabel?: string;
  };

  let { from, to, fromLabel = 'Previous output', toLabel = 'Current input' }: Props = $props();

  const diff = $derived(computeDiff(from, to));

  function computeDiff(oldVal: unknown, newVal: unknown, path = ''): DiffEntry[] {
    const results: DiffEntry[] = [];

    if (oldVal === null && newVal === null) {
      return [{ path, type: 'unchanged', oldValue: oldVal, newValue: newVal }];
    }
    if (oldVal === undefined && newVal === undefined) {
      return [{ path, type: 'unchanged', oldValue: oldVal, newValue: newVal }];
    }
    if (oldVal === null || oldVal === undefined) {
      return [{ path, type: 'added', newValue: newVal }];
    }
    if (newVal === null || newVal === undefined) {
      return [{ path, type: 'removed', oldValue: oldVal }];
    }

    if (typeof oldVal !== typeof newVal) {
      return [{ path, type: 'modified', oldValue: oldVal, newValue: newVal }];
    }

    if (typeof oldVal !== 'object') {
      if (oldVal === newVal) {
        return [{ path, type: 'unchanged', oldValue: oldVal, newValue: newVal }];
      }
      return [{ path, type: 'modified', oldValue: oldVal, newValue: newVal }];
    }

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const maxLen = Math.max(oldVal.length, newVal.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        if (i >= oldVal.length) {
          results.push({ path: itemPath, type: 'added', newValue: newVal[i] });
        } else if (i >= newVal.length) {
          results.push({ path: itemPath, type: 'removed', oldValue: oldVal[i] });
        } else {
          results.push(...computeDiff(oldVal[i], newVal[i], itemPath));
        }
      }
      return results;
    }

    if (!Array.isArray(oldVal) && !Array.isArray(newVal)) {
      const oldObj = oldVal as Record<string, unknown>;
      const newObj = newVal as Record<string, unknown>;
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

      for (const key of allKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        if (!(key in oldObj)) {
          results.push({ path: keyPath, type: 'added', newValue: newObj[key] });
        } else if (!(key in newObj)) {
          results.push({ path: keyPath, type: 'removed', oldValue: oldObj[key] });
        } else {
          results.push(...computeDiff(oldObj[key], newObj[key], keyPath));
        }
      }
      return results;
    }

    return [{ path, type: 'modified', oldValue: oldVal, newValue: newVal }];
  }

  function formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      if (str.length > 80) return str.slice(0, 80) + '...';
      return str;
    }
    return String(value);
  }

  const typeStyles: Record<DiffType, { bg: string; border: string; text: string; icon: string }> = {
    added: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: '+' },
    removed: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '-' },
    modified: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '~' },
    unchanged: { bg: 'bg-[var(--surface-alt)]', border: 'border-[var(--border)]', text: 'text-[var(--text-3)]', icon: '=' },
  };

  const significantChanges = $derived(diff.filter(d => d.type !== 'unchanged'));
  const hasChanges = $derived(significantChanges.length > 0);
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between text-[0.75rem] text-[var(--text-3)]">
    <span>{fromLabel}</span>
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
    <span>{toLabel}</span>
  </div>

  {#if !hasChanges}
    <div class="text-center py-4 text-[var(--text-3)] text-[0.8125rem] bg-[var(--surface-alt)] rounded-[var(--radius)] border border-[var(--border)]">
      No changes between steps
    </div>
  {:else}
    <div class="space-y-1 max-h-[300px] overflow-y-auto">
      {#each significantChanges as change}
        {@const style = typeStyles[change.type]}
        <div class="flex items-start gap-2 p-2 rounded-[var(--radius)] border {style.bg} {style.border}">
          <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[0.75rem] font-bold {style.text} bg-[var(--surface)]/50">
            {style.icon}
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-[0.6875rem] font-mono text-[var(--text-2)] truncate">{change.path || 'root'}</div>
            <div class="mt-1 space-y-1">
              {#if change.oldValue !== undefined}
                <div class="text-[0.75rem]">
                  <span class="text-red-400">-</span>
                  <span class="font-mono text-[var(--text-3)]">{formatValue(change.oldValue)}</span>
                </div>
              {/if}
              {#if change.newValue !== undefined}
                <div class="text-[0.75rem]">
                  <span class="text-emerald-400">+</span>
                  <span class="font-mono text-[var(--text)]">{formatValue(change.newValue)}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="flex items-center gap-4 text-[0.6875rem] text-[var(--text-3)] pt-2 border-t border-[var(--border)]">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[0.625rem]">+</span>
        {significantChanges.filter(d => d.type === 'added').length} added
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-[0.625rem]">-</span>
        {significantChanges.filter(d => d.type === 'removed').length} removed
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-[0.625rem]">~</span>
        {significantChanges.filter(d => d.type === 'modified').length} modified
      </span>
    </div>
  {/if}
</div>
