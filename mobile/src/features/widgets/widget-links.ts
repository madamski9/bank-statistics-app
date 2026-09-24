const revealQuery = /[?&]widget=reveal(?:[&#]|$)/;

export const widgetRevealParams = { widget: 'reveal' } as const;

export const widgetRevealWindowMs = 5 * 60_000;

export function isWidgetRevealUrl(url: string | null): boolean {
  return url !== null && revealQuery.test(url);
}
