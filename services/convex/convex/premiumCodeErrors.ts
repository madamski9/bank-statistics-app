const premiumCodeInvalid = 'premiumCodeInvalid';
const premiumAlreadyPermanent = 'premiumAlreadyPermanent';

function hasErrorCode(data: unknown, code: string): boolean {
  return typeof data === 'object' && data !== null && 'code' in data && data.code === code;
}

export function premiumCodeInvalidError() {
  return { code: premiumCodeInvalid, message: 'This code is not valid.' };
}

export function premiumAlreadyPermanentError() {
  return { code: premiumAlreadyPermanent, message: 'Premium is already active for good.' };
}

export function isPremiumCodeInvalid(data: unknown): boolean {
  return hasErrorCode(data, premiumCodeInvalid);
}

export function isPremiumAlreadyPermanent(data: unknown): boolean {
  return hasErrorCode(data, premiumAlreadyPermanent);
}
