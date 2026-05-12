import crypto from "node:crypto";

export const AUTH_COOKIE_NAME = "cam_auth";
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 12;

const DEFAULT_AUTH_USERNAME = "admin";
const DEFAULT_AUTH_PASSWORD = "admin123";
const DEFAULT_AUTH_SECRET = "change-this-auth-secret";

function getAuthConfig() {
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

export function isValidCredentials(username, password) {
  const auth = getAuthConfig();
  return safeEqual(username, auth.username) && safeEqual(password, auth.password);
}

export function createSessionToken(username) {
  const auth = getAuthConfig();
  const payload = Buffer.from(
    JSON.stringify({
      u: username,
      exp: Date.now() + AUTH_SESSION_TTL_SECONDS * 1000,
    })
  ).toString("base64url");
  const signature = signPayload(payload, auth.secret);
  return `${payload}.${signature}`;
}

export function isValidSessionToken(token) {
  if (!token || typeof token !== "string") return false;
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return false;

  const auth = getAuthConfig();
  const expectedSignature = signPayload(payloadBase64, auth.secret);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return false;
    if (!safeEqual(payload.u, auth.username)) return false;
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

export function getSessionTokenFromRequest(request) {
  return getCookieValue(request.headers.get("cookie"), AUTH_COOKIE_NAME);
}

export function ensureAuthenticatedRequest(request) {
  const token = getSessionTokenFromRequest(request);
  if (isValidSessionToken(token)) return null;
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
