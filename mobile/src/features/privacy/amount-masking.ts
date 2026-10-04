const maskedDigitBase = 0xe000;
const digit = /[0-9]/g;
const maskedDigit = /[-]/g;

export function maskAmountLabel(label: string): string {
  return label.replace(digit, (value) => String.fromCharCode(maskedDigitBase + Number(value)));
}

export function containsMaskedAmount(text: string): boolean {
  return /[-]/.test(text);
}

export function revealMaskedAmount(text: string): string {
  return text.replace(maskedDigit, (value) => String(value.charCodeAt(0) - maskedDigitBase));
}
