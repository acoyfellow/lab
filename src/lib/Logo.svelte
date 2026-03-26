<script lang="ts">
  type Props = {
    class?: string;
    title?: string;
  };

  let { class: className, title }: Props = $props();

  let active = $state(false);
</script>

<svg
  class={`logo ${active ? 'active' : ''} ${className ?? ''}`}
  viewBox="0 0 312 96"
  xmlns="http://www.w3.org/2000/svg"
  aria-label={title}
  aria-hidden={title ? undefined : 'true'}
  role={title ? 'img' : undefined}
  focusable="false"
  onmouseenter={() => (active = true)}
  onmouseleave={() => (active = false)}
>
  {#if title}
    <title>{title}</title>
  {/if}

  <path
    d="M311.5 95.5V36.5H299.5V0.5H216.5V95.5H311.5ZM239.5 23.5H276.5V36.5H239.5V23.5ZM239.5 59.5H288.5V72.5H239.5V59.5Z"
    class="svg-elem-1"
  />
  <path
    d="M203.5 0.5V95.5H180.5V71.5H131.5V95.5H108.5V0.5H203.5ZM131.5 48.5H180.5V23.5H131.5V48.5Z"
    class="svg-elem-2"
  />
  <path
    d="M23.5 0.5V72.5H95.5V95.5H0.5V0.5H23.5Z"
    class="svg-elem-3"
  />
</svg>

<style lang="postcss">
  .logo {
    --logo-fill: #000;
    --logo-stroke: transparent;
    display: block;
    cursor: pointer;
  }

  .logo path {
    fill: var(--logo-fill);
    stroke: var(--logo-stroke);
    stroke-width: 2;
    stroke-linejoin: miter;
    stroke-miterlimit: 2;
    transition:
      fill 160ms ease,
      stroke 160ms ease,
      stroke-opacity 160ms ease;
    stroke-opacity: 0;
  }

  .logo:hover,
  .logo.active,
  .logo:focus-visible {
    --logo-fill: #fff;
    --logo-stroke: #000;
  }

  .logo:hover path,
  .logo.active path,
  .logo:focus-visible path {
    stroke-opacity: 1;
    transition:
      fill 160ms ease,
      stroke 160ms ease,
      stroke-opacity 160ms ease,
      stroke-dashoffset 520ms ease;
  }

  .logo .svg-elem-1 {
    stroke-dasharray: 606px;
    stroke-dashoffset: 606px;
    transition-delay: 0ms;
  }
  .logo .svg-elem-2 {
    stroke-dasharray: 578px;
    stroke-dashoffset: 578px;
    transition-delay: 20ms;
  }
  .logo .svg-elem-3 {
    stroke-dasharray: 382px;
    stroke-dashoffset: 382px;
    transition-delay: 40ms;
  }

  .logo:hover .svg-elem-1,
  .logo.active .svg-elem-1,
  .logo:focus-visible .svg-elem-1,
  .logo:hover .svg-elem-2,
  .logo.active .svg-elem-2,
  .logo:focus-visible .svg-elem-2,
  .logo:hover .svg-elem-3,
  .logo.active .svg-elem-3,
  .logo:focus-visible .svg-elem-3 {
    stroke-dashoffset: 0px;
  }

  @media (prefers-reduced-motion: reduce) {
    .logo path {
      stroke-dasharray: none;
      stroke-dashoffset: 0;
      transition:
        fill 120ms ease,
        stroke 120ms ease,
        stroke-opacity 120ms ease;
    }
  }
</style>
