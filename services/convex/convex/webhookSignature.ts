const toleranceSeconds = 5 * 60;

export interface SignedWebhook {
  secret: string;
  messageId: string;
  timestamp: string;
  signatureHeader: string;
  body: string;
  now: number;
}

function bytesFromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function base64FromBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function isSameText(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export async function webhookSignature(secret: string, signedContent: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    bytesFromBase64(secret.replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));

  return base64FromBytes(new Uint8Array(signature));
}

export async function isValidWebhook(webhook: SignedWebhook): Promise<boolean> {
  const sentAt = Number(webhook.timestamp);

  if (!Number.isFinite(sentAt) || Math.abs(webhook.now / 1000 - sentAt) > toleranceSeconds) {
    return false;
  }

  const expected = await webhookSignature(
    webhook.secret,
    `${webhook.messageId}.${webhook.timestamp}.${webhook.body}`,
  );

  return webhook.signatureHeader.split(' ').some((candidate) => {
    const [version, signature] = candidate.split(',');

    return version === 'v1' && signature !== undefined && isSameText(signature, expected);
  });
}
