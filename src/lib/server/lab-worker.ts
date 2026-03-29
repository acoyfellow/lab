import { dev } from '$app/environment';

const DEV_LAB_WORKER_ORIGIN = 'http://localhost:1337';

function workerUrl(path: string): string {
  return dev ? `${DEV_LAB_WORKER_ORIGIN}${path}` : `http://worker${path}`;
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
