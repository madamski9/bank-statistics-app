const platformNames = {
  ios: 'iPhone',
  android: 'Android',
  web: 'Przeglądarka',
} as const;

export type DevicePlatform = keyof typeof platformNames;

export function devicePlatformName(platform: DevicePlatform): string {
  return platformNames[platform];
}

export function lastSeenLabel(lastSeenAt: number, now: number): string {
  const minutes = Math.floor((now - lastSeenAt) / 60_000);

  if (minutes < 5) {
    return 'aktywne teraz';
  }

  if (minutes < 60) {
    return `aktywne ${minutes} min temu`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `aktywne ${hours} godz. temu`;
  }

  const days = Math.floor(hours / 24);

  return days === 1 ? 'aktywne wczoraj' : `aktywne ${days} dni temu`;
}
