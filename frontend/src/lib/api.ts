const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type ApiErrorBody = {
  detail?: string;
  error_code?: string;
  message?: string;
  user_message?: string;
};

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
    const data = (await response.json()) as ApiErrorBody;
    return (
      data.user_message ??
      data.message ??
      data.detail ??
      getFallbackErrorMessage(response.status)
    );
  } catch {
    return getFallbackErrorMessage(response.status);
  }
}

function getFallbackErrorMessage(status: number) {
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 404) {
    return "We couldn't find what you were looking for.";
  }

  if (status >= 500) {
    return "Something went wrong on our side. Please try again in a moment.";
  }

  return "We couldn't complete that request. Please try again.";
}
