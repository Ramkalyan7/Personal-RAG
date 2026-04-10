export function validateSingleWebsiteUrl(value: string): string | null {
  return validateSingleUrl(value, { requireYoutube: false });
}

export function validateSingleYoutubeUrl(value: string): string | null {
  return validateSingleUrl(value, { requireYoutube: true });
}

function validateSingleUrl(
  value: string,
  options: { requireYoutube: boolean },
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length !== 1) {
    return null;
  }

  const candidate = parts[0];

  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
      return null;
    }

    if (options.requireYoutube && !isYoutubeHost(parsed.hostname)) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

function isYoutubeHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "youtu.be" ||
    normalized === "youtube.com" ||
    normalized === "www.youtube.com" ||
    normalized === "m.youtube.com"
  );
}
