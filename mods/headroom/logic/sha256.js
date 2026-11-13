// SHA-256 (FIPS 180-4), synchronous and in plain JavaScript: Herdr's runtime
// has no usable Web Crypto digest: its promise never settles there.

// The first 32 bits of the fractional parts of the cube roots of the first 64
// primes.
const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

// The first 32 bits of the fractional parts of the square roots of the first
// 8 primes.
const H0 = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
];

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

// The 32-byte digest of `bytes`, a Uint8Array.
export function sha256(bytes) {
  // The message, a 1 bit, zeros, and the length in bits as 64 bits, filling
  // whole 64-byte blocks.
  const length = bytes.length;
  const padded = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
  padded.set(bytes);
  padded[length] = 0x80;
  const bits = length * 8;
  const end = padded.length;
  const high = Math.floor(bits / 0x100000000);
  for (let i = 0; i < 4; i += 1) {
    padded[end - 1 - i] = (bits >>> (8 * i)) & 0xff;
    padded[end - 5 - i] = (high >>> (8 * i)) & 0xff;
  }

  const h = Uint32Array.from(H0);
  const w = new Uint32Array(64);
  for (let block = 0; block < end; block += 64) {
    for (let t = 0; t < 16; t += 1) {
      const at = block + t * 4;
      w[t] =
        (padded[at] << 24) |
        (padded[at + 1] << 16) |
        (padded[at + 2] << 8) |
        padded[at + 3];
    }
    for (let t = 16; t < 64; t += 1) {
      const a = w[t - 15];
      const b = w[t - 2];
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[t] = w[t - 16] + s0 + w[t - 7] + s1;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choice = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + choice + K[t] + w[t]) | 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + majority) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }

  const digest = new Uint8Array(32);
  for (let i = 0; i < 8; i += 1) {
    digest[i * 4] = h[i] >>> 24;
    digest[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    digest[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    digest[i * 4 + 3] = h[i] & 0xff;
  }
  return digest;
}
