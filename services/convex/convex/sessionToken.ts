import type { SignedInOwner } from './owner';

const reverificationWindowMinutes = 10;
const clockSkewSeconds = 5;

export interface SigningKey {
  kid?: string;
  kty: string;
  n?: string;
  e?: string;
}

export interface SessionTokenCheck {
  token: string;
  keys: SigningKey[];
  issuer: string;
  owner: SignedInOwner;
  now: number;
}

interface TokenHeader {
  alg?: unknown;
  kid?: unknown;
}

interface TokenClaims {
  iss?: unknown;
  sub?: unknown;
  sid?: unknown;
  exp?: unknown;
  nbf?: unknown;
  fva?: unknown;
}

function bytesFromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function decodeSegment<T>(segment: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(bytesFromBase64Url(segment))) as T;
  } catch {
    return null;
  }
}

async function hasValidSignature(signedContent: string, signature: string, key: SigningKey): Promise<boolean> {
  if (key.kty !== 'RSA' || key.n === undefined || key.e === undefined) {
    return false;
  }

  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: key.n, e: key.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      bytesFromBase64Url(signature),
      new TextEncoder().encode(signedContent),
    );
  } catch {
    return false;
  }
}

function isFreshFirstFactor(claim: unknown): boolean {
  if (!Array.isArray(claim) || typeof claim[0] !== 'number') {
    return false;
  }

  return claim[0] >= 0 && claim[0] <= reverificationWindowMinutes;
}

function isCurrent(claims: TokenClaims, now: number): boolean {
  const nowSeconds = now / 1000;

  if (typeof claims.exp !== 'number' || claims.exp + clockSkewSeconds < nowSeconds) {
    return false;
  }

  return typeof claims.nbf !== 'number' || claims.nbf - clockSkewSeconds <= nowSeconds;
}

export async function isRecentlyVerifiedSession(check: SessionTokenCheck): Promise<boolean> {
  const segments = check.token.split('.');

  if (segments.length !== 3) {
    return false;
  }

  const [encodedHeader, encodedClaims, signature] = segments as [string, string, string];
  const header = decodeSegment<TokenHeader>(encodedHeader);
  const claims = decodeSegment<TokenClaims>(encodedClaims);

  if (header === null || claims === null || header.alg !== 'RS256') {
    return false;
  }

  const key = check.keys.find((candidate) => candidate.kid === header.kid);

  if (key === undefined || !(await hasValidSignature(`${encodedHeader}.${encodedClaims}`, signature, key))) {
    return false;
  }

  return (
    claims.iss === check.issuer &&
    claims.sub === check.owner.ownerId &&
    claims.sid === check.owner.sessionId &&
    isCurrent(claims, check.now) &&
    isFreshFirstFactor(claims.fva)
  );
}

export async function fetchSigningKeys(issuer: string): Promise<SigningKey[]> {
  const response = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/jwks.json`);

  if (!response.ok) {
    throw new Error(`Clerk signing keys are unavailable (status ${response.status}).`);
  }

  const body = (await response.json()) as { keys?: SigningKey[] };

  return body.keys ?? [];
}
