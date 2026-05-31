const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const buildAvatarUrl = (avatar?: string | null): string | null => {
  if (!avatar) return null;

  if (/^https?:\/\//i.test(avatar)) {
    try {
      const parsed = new URL(avatar);
      // Some legacy records may store frontend-hosted upload URLs.
      // Uploaded files are served by backend, so map these to API_URL.
      if (
        parsed.pathname.startsWith("/uploads/") &&
        (parsed.host === "localhost:3000" || parsed.host === "127.0.0.1:3000")
      ) {
        return `${API_URL}${parsed.pathname}`;
      }
    } catch {
      return avatar;
    }

    return avatar;
  }

  if (avatar.startsWith("/")) return `${API_URL}${avatar}`;
  return `${API_URL}/${avatar}`;
};
