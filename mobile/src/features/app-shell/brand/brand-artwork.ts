import { bubbleTints, type BubbleKey } from '@/features/app-shell/theme/overview-theme';

export const brandColors = {
  background: '#000000',
  foreground: '#FFFFFF',
  secondary: '#8E8E93',
  mint: bubbleTints.income.film,
  ice: '#5FD8FF',
  violet: bubbleTints.net.film,
} as const;

export const brandName = 'BankStats';

export const brandBubbles = [
  { key: 'income', x: 91, y: 36, radius: 22 },
  { key: 'net', x: 96, y: 94, radius: 16 },
  { key: 'expense', x: 44, y: 69, radius: 33 },
] as const;

export function brandBubbleBody(key: BubbleKey, x: number, y: number, radius: number): string {
  const { film, rgbSecondary } = bubbleTints[key];
  const secondary = `rgb(${rgbSecondary})`;
  const id = `brand-${key}`;

  return `<g transform="translate(${x - radius} ${y - radius}) scale(${radius / 50})">
  <defs>
    <radialGradient id="${id}-film" cx="46%" cy="42%" r="59%">
      <stop stop-color="${film}" stop-opacity="0.08"/>
      <stop offset="0.48" stop-color="${film}" stop-opacity="0.04"/>
      <stop offset="0.74" stop-color="${film}" stop-opacity="0.18"/>
      <stop offset="0.9" stop-color="${film}" stop-opacity="0.62"/>
      <stop offset="0.98" stop-color="${secondary}" stop-opacity="0.84"/>
      <stop offset="1" stop-color="${film}" stop-opacity="0.5"/>
    </radialGradient>
    <radialGradient id="${id}-light" cx="28%" cy="20%" r="76%">
      <stop stop-color="#EAF7FF" stop-opacity="0.45"/>
      <stop offset="0.36" stop-color="${secondary}" stop-opacity="0.14"/>
      <stop offset="0.7" stop-color="${film}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-bounce">
      <stop stop-color="${secondary}" stop-opacity="0.65"/>
      <stop offset="0.5" stop-color="${secondary}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-reflection">
      <stop stop-color="#FFFFFF" stop-opacity="0.96"/>
      <stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.7"/>
      <stop offset="0.65" stop-color="#EAF7FF" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#EAF7FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}-edge" x1="12%" y1="0%" x2="86%" y2="100%">
      <stop stop-color="#FFFFFF" stop-opacity="0.92"/>
      <stop offset="0.3" stop-color="${secondary}" stop-opacity="0.64"/>
      <stop offset="0.56" stop-color="${film}" stop-opacity="0.24"/>
      <stop offset="0.82" stop-color="${secondary}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.64"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="49" fill="#050608"/>
  <circle cx="50" cy="50" r="49" fill="url(#${id}-film)"/>
  <circle cx="50" cy="50" r="49" fill="url(#${id}-light)"/>
  <ellipse cx="54" cy="84" rx="29" ry="10" fill="url(#${id}-bounce)" transform="rotate(-20 54 84)"/>
  <circle cx="50" cy="50" r="48.8" fill="none" stroke="url(#${id}-edge)" stroke-width="1.6"/>
  <ellipse cx="30" cy="22" rx="18" ry="7" fill="url(#${id}-reflection)" transform="rotate(-32 30 22)"/>
  <ellipse cx="76" cy="82" rx="7" ry="3.5" fill="url(#${id}-reflection)" opacity="0.65" transform="rotate(-38 76 82)"/>
</g>`;
}

export const brandMarkBody = brandBubbles
  .map(({ key, x, y, radius }) => brandBubbleBody(key, x, y, radius))
  .join('\n');

export const brandMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${brandMarkBody}</svg>`;
