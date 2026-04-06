const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type RequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: "GET" | "POST";
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  { body, headers, method = "GET", token }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    body,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? "Request failed";
  } catch {
    return "Request failed";
  }
}
