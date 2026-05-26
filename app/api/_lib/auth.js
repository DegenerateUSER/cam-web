import crypto from "node:crypto";

export const VALID_LOCATIONS = ["ghaziabad", "hapur", "shamli"];

export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 12;

const DEFAULT_AUTH_USERNAME = "admin";
const DEFAULT_AUTH_PASSWORD = "admin123";
const DEFAULT_AUTH_SECRET = "change-this-auth-secret";

/**
 * Returns the cookie name for a specific location.
 * Each location gets its own independent session cookie.
 */
export function getAuthCookieName(location) {
  if (!location || !VALID_LOCATIONS.includes(location)) {
    return "cam_auth";
  }
  return `cam_auth_${location}`;
}

/**
 * Get auth config for a location.
 * For now all locations share the same credentials from .env.
 * To add per-location credentials later, check for e.g. AUTH_USERNAME_HAPUR.
 */
function getAuthConfig(location) {
  return {
    username: (process.env.AUTH_USERNAME || DEFAULT_AUTH_USERNAME).trim(),
    password: (process.env.AUTH_PASSWORD || DEFAULT_AUTH_PASSWORD).trim(),
    secret: (process.env.AUTH_SECRET || DEFAULT_AUTH_SECRET).trim(),
  };
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(String(a ?? ""));
  const bBuffer = Buffer.from(String(b ?? ""));
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function signPayload(payloadBase64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

export function isValidCredentials(username, password, location) {
  const auth = getAuthConfig(location);
  return safeEqual(username, auth.username) && safeEqual(password, auth.password);
}

export function createSessionToken(username, location) {
  const auth = getAuthConfig(location);
  const payload = Buffer.from(
    JSON.stringify({
      u: username,
      loc: location,
      exp: Date.now() + AUTH_SESSION_TTL_SECONDS * 1000,
    })
  ).toString("base64url");
  const signature = signPayload(payload, auth.secret);
  return `${payload}.${signature}`;
}

export function isValidSessionToken(token, location) {
  if (!token || typeof token !== "string") return false;
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return false;

  const auth = getAuthConfig(location);
  const expectedSignature = signPayload(payloadBase64, auth.secret);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return false;
    if (!safeEqual(payload.u, auth.username)) return false;
    // Verify the token was issued for this specific location
    if (location && payload.loc !== location) return false;
    if (typeof payload.exp !== "number") return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

function getCookieValue(cookieHeader, name) {
  const target = `${name}=`;
  const cookiePart = (cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));
  if (!cookiePart) return null;
  return cookiePart.slice(target.length);
}

export function getSessionTokenFromRequest(request, location) {
  const cookieName = getAuthCookieName(location);
  return getCookieValue(request.headers.get("cookie"), cookieName);
}

export function ensureAuthenticatedRequest(request, location) {
  const token = getSessionTokenFromRequest(request, location);
  if (isValidSessionToken(token, location)) return null;
  return new Response("Unauthorized", { status: 401 });
}

export function shouldUseSecureCookie(requestOrUrl) {
  if (requestOrUrl && typeof requestOrUrl === "object" && "headers" in requestOrUrl) {
    const forwardedProto =
      requestOrUrl.headers.get("x-forwarded-proto") ||
      requestOrUrl.headers.get("x-forwarded-protocol");
    if (forwardedProto) {
      return forwardedProto.split(",")[0].trim() === "https";
    }
    requestOrUrl = requestOrUrl.url;
  }

  try {
    return new URL(String(requestOrUrl || "")).protocol === "https:";
  } catch {
    return false;
  }
}
