export const brandColors = {
  background: '#000000',
  foreground: '#FFFFFF',
  secondary: '#8E8E93',
  mint: '#3DE8A0',
  ice: '#5FD8FF',
  violet: '#8F7BFF',
} as const;

export const brandName = 'BankStats';

export const brandMarkBody = `<defs>
  <linearGradient id="inflow" x1="28" y1="20" x2="94" y2="62" gradientUnits="userSpaceOnUse">
    <stop stop-color="${brandColors.mint}"/>
    <stop offset="1" stop-color="${brandColors.ice}"/>
  </linearGradient>
  <linearGradient id="outflow" x1="28" y1="70" x2="94" y2="112" gradientUnits="userSpaceOnUse">
    <stop stop-color="${brandColors.ice}"/>
    <stop offset="1" stop-color="${brandColors.violet}"/>
  </linearGradient>
</defs>
<path d="M34 57V24H65C88 24 88 57 65 57H34Z" fill="none" stroke="url(#inflow)" stroke-width="14" stroke-linejoin="round"/>
<path d="M34 75V108H69C94 108 94 75 69 75H34Z" fill="none" stroke="url(#outflow)" stroke-width="14" stroke-linejoin="round"/>`;

export const brandMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${brandMarkBody}</svg>`;
