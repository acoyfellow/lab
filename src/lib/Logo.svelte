<script lang="ts">
  type Props = {
    class?: string;
    title?: string;
  };

  let { class: className, title }: Props = $props();
</script>

<svg
  class={`logo ${className ?? ''}`}
  viewBox="0 0 312 96"
  xmlns="http://www.w3.org/2000/svg"
  aria-label={title}
  aria-hidden={title ? undefined : 'true'}
  role={title ? 'img' : undefined}
  focusable="false"
>
  {#if title}
    <title>{title}</title>
  {/if}

  <path d="M288 0H276H264H252H240H228H216V12V24V36V48V60V72V84V96H228H240H252H264H276H288H300H312V84V72V60V48V36H300V24V12V0H288ZM264 24H276V36H264H252H240V24H252H264ZM276 60H288V72H276H264H252H240V60H252H264H276Z" />
  <path d="M192 96H180V84V72H168H156H144H132V84V96H120H108V84V72V60V48V36V24V12V0H120H132H144H156H168H180H192H204V12V24V36V48V60V72V84V96H192ZM168 48H180V36V24H168H156H144H132V36V48H144H156H168Z" />
  <path d="M84 96H72H60H48H36H24H12H0V84V72V60V48V36V24V12V0H12H24V12V24V36V48V60V72H36H48H60H72H84H96V84V96H84Z" />
</svg>

<style>
  .logo {
    --logo-fill: #000;
    --logo-stroke: transparent;
    display: block;
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
    stroke-dasharray: 1200;
    stroke-dashoffset: 1200;
    stroke-opacity: 0;
  }

  .logo:hover,
  .logo:focus-visible {
    --logo-fill: #fff;
    --logo-stroke: #000;
  }

  .logo:hover path,
  .logo:focus-visible path {
    stroke-opacity: 1;
    stroke-dashoffset: 0;
    transition:
      fill 160ms ease,
      stroke 160ms ease,
      stroke-opacity 160ms ease,
      stroke-dashoffset 520ms ease;
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
