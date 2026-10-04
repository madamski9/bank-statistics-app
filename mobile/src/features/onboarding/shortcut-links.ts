const shortcutUrls = {
  millennium: 'https://www.icloud.com/shortcuts/45c335f2b7ad450885f9613939fe7b1f',
  pko: 'https://www.icloud.com/shortcuts/fc6262c04b8c4a218b88a9a92ce8f381',
  millenniumAndPko: 'https://www.icloud.com/shortcuts/8920bdb2274d4782b71ae72b1732ea0e',
};

export function shortcutUrlFor(selectedBanks: string[]): string {
  const includesMillennium = selectedBanks.includes('millennium');
  const includesPko = selectedBanks.includes('pko');

  if (includesMillennium && includesPko) {
    return shortcutUrls.millenniumAndPko;
  }

  return includesPko ? shortcutUrls.pko : shortcutUrls.millennium;
}
