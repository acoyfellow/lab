import { dev } from '$app/environment';

const DEV_LAB_WORKER_ORIGIN = 'http://localhost:1337';

export function labWorkerOrigin(): string {
  if (!dev) return 'http://worker';
  return (
    process.env.LAB_WORKER_ORIGIN?.trim().replace(/\/+$/, '') ||
    process.env.LAB_URL?.trim().replace(/\/+$/, '') ||
    DEV_LAB_WORKER_ORIGIN
  );
}

function workerUrl(path: string): string {
  return `${labWorkerOrigin()}${path}`;
}

export async function fetchLabWorker(
  platform: App.Platform | undefined,
  path: string,
  init?: RequestInit
): Promise<Response> {
  if (dev) {
    return fetch(workerUrl(path), init);
  }

  return platform!.env!.WORKER.fetch(new Request(workerUrl(path), init));
}

export async function forwardLabWorkerRequest(
  platform: App.Platform | undefined,
  request: Request,
  path: string
): Promise<Response> {
  if (dev) {
    return fetch(new Request(workerUrl(path), request));
  }

  return platform!.env!.WORKER.fetch(new Request(workerUrl(path), request));
}
