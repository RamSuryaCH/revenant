export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
  get rateLimited(): boolean {
    return this.status === 429 || this.status === 403;
  }
}

export interface FetchOpts {
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  fetchImpl?: typeof fetch;
}

/** JSON GET/POST with timeout. Returns null on 404; throws HttpError otherwise. */
export async function getJson<T>(url: string, o: FetchOpts = {}): Promise<T | null> {
  const f = o.fetchImpl ?? fetch;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), o.timeoutMs ?? 8000);
  try {
    const res = await f(url, {
      method: o.method ?? "GET",
      body: o.body,
      headers: { accept: "application/json", "user-agent": "revenant-engine", ...(o.body ? { "content-type": "application/json" } : {}), ...o.headers },
      signal: ctl.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new HttpError(res.status, url);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function getText(url: string, o: FetchOpts = {}): Promise<string | null> {
  const f = o.fetchImpl ?? fetch;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), o.timeoutMs ?? 8000);
  try {
    const res = await f(url, { headers: { "user-agent": "revenant-engine", ...o.headers }, signal: ctl.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new HttpError(res.status, url);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** Run async tasks with bounded concurrency, preserving order. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return out;
}
