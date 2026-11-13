// PKCE (RFC 7636): the verifier's encoding and its S256 challenge, with
// what Herdr's runtime has (no TextEncoder).

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
export async function challengeOf(verifier) {
  const bytes = Uint8Array.from(verifier, (char) => char.charCodeAt(0));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64url(new Uint8Array(digest));
}
