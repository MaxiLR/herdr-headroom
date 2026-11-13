// PKCE (RFC 7636): the verifier's encoding and its S256 challenge, with what
// Herdr's runtime has: no TextEncoder, and no Web Crypto digest (its promise
// never settles there), so the hash is `sha256.js`'s and synchronous.
import { sha256 } from "./sha256.js";

// `bytes` in base64url, without padding.
export function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// The S256 challenge of `verifier`, an ASCII string.
export function challengeOf(verifier) {
  const bytes = Uint8Array.from(verifier, (char) => char.charCodeAt(0));
  return base64url(sha256(bytes));
}
