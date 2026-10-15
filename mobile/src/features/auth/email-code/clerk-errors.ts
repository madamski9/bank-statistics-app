import { isClerkAPIResponseError } from '@clerk/expo';

const rejectedCodeErrors = new Set(['form_code_incorrect', 'verification_expired', 'verification_failed']);

function clerkErrorCodes(error: { code: string } | null): string[] {
  if (error === null) {
    return [];
  }

  return isClerkAPIResponseError(error) ? error.errors.map((detail) => detail.code) : [error.code];
}

export function isRejectedCode(error: { code: string } | null): boolean {
  return clerkErrorCodes(error).some((code) => rejectedCodeErrors.has(code));
}

export function needsSignUpTransfer(error: { code: string } | null): boolean {
  return clerkErrorCodes(error).includes('sign_up_if_missing_transfer');
}
