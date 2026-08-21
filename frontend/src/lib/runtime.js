const KNOWN_APP_ROUTES = [
  "/lobby",
  "/slots",
  "/keno",
  "/coinflip",
  "/wheel",
  "/tournament",
  "/leaderboard",
  "/vip",
  "/responsible-gaming",
  "/fleet-sales",
  "/terms",
  "/privacy",
  "/responsible-gambling",
  "/age-verification",
  "/cookie-policy",
  "/aml-policy",
  "/bonus-terms",
  "/wallet",
  "/cashier",
  "/profile",
  "/kyc",
  "/payment",
  "/admin",
];

function trimTrailingSlash(value) {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function normalizePath(path) {
  if (!path) return "";
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const clean = trimTrailingSlash(withLeadingSlash);
  return clean === "/" ? "" : clean;
}

function inferBasePathFromLocation(pathname) {
  const cleanPath = trimTrailingSlash(pathname || "") || "/";
  if (cleanPath === "/") return "";

  // If URL already starts at a known route, the app is mounted at root.
  if (
    KNOWN_APP_ROUTES.some(
      (route) => cleanPath === route || cleanPath.startsWith(`${route}/`),
    )
  ) {
    return "";
  }

  // If a known route appears later, everything before it is the base path.
  let matchIndex = -1;
  for (const route of KNOWN_APP_ROUTES) {
    const idx = cleanPath.indexOf(route);
    if (idx > 0 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
    }
  }
  if (matchIndex > 0) {
    return cleanPath.slice(0, matchIndex);
  }

  // No route fragment found: assume current path is the mount base.
  return cleanPath;
}

export function getAppBasePath() {
  const envBase = normalizePath(process.env.REACT_APP_BASE_PATH || "");
  if (envBase) return envBase;

  const publicUrl = (process.env.PUBLIC_URL || "").trim();
  if (publicUrl && publicUrl !== "." && !/^https?:\/\//i.test(publicUrl)) {
    return normalizePath(publicUrl);
  }

  if (typeof window === "undefined") return "";
  return inferBasePathFromLocation(window.location.pathname);
}

export function getAppOriginUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${getAppBasePath()}`;
}

export function getBackendOriginUrl() {
  const explicit = (process.env.REACT_APP_BACKEND_URL || "").trim();
  if (explicit) {
    try {
      const explicitOrigin = new URL(explicit).origin;
      if (
        typeof window !== "undefined" &&
        window.location.hostname.endsWith(".preview.emergentagent.com") &&
        explicitOrigin !== window.location.origin
      ) {
        return window.location.origin;
      }
    } catch (error) {
      // Ignore malformed values and fall through to the current origin below.
    }
    return trimTrailingSlash(explicit);
  }
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
