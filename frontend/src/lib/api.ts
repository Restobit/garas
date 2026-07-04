export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

/** Clerk token-lekérő regisztrálása (dev módban nincs — x-dev-user header megy). */
export function setTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function authHeaders(): Promise<Record<string, string>> {
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) return { Authorization: `Bearer ${token}` };
  }
  return { "x-dev-user": localStorage.getItem("garas.devUser") ?? "dev-user" };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && typeof init.body === "string") headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Hiba (${res.status})`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      code = body.error?.code;
    } catch {
      // nem JSON hibaválasz
    }
    throw new ApiRequestError(res.status, message, code);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, file: File): Promise<T> => {
    const form = new FormData();
    form.append("file", file);
    return request<T>(path, { method: "POST", body: form });
  },
};

/** Védett fájl (kép/csatolmány) letöltése objektum-URL-ként. */
export async function fetchFileUrl(path: string): Promise<string> {
  const res = await fetch(`${API_URL}/api${path}`, { headers: await authHeaders() });
  if (!res.ok) throw new ApiRequestError(res.status, "A fájl nem tölthető le");
  return URL.createObjectURL(await res.blob());
}
