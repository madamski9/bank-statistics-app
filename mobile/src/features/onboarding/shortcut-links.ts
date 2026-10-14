const shortcutUrls: Record<string, string> = {
  millennium: 'https://www.icloud.com/shortcuts/45c335f2b7ad450885f9613939fe7b1f',
  pko: 'https://www.icloud.com/shortcuts/fc6262c04b8c4a218b88a9a92ce8f381',
  'millennium+pko': 'https://www.icloud.com/shortcuts/8920bdb2274d4782b71ae72b1732ea0e',
  ing: 'https://www.icloud.com/shortcuts/5b288903ffb54dcc81855d2cd6708c10',
  'pko+ing': 'https://www.icloud.com/shortcuts/0670b6ddc85b4414aa1f258704a5f3e5',
  'millennium+ing': 'https://www.icloud.com/shortcuts/c763e56eaf82408a9aaab02829893a0d',
  'millennium+pko+ing': 'https://www.icloud.com/shortcuts/61b8589ba38b45df8dfb0c6f46ee47cc',
};

const shortcutBankOrder = ['millennium', 'pko', 'ing'];

export function shortcutUrlFor(selectedBanks: string[]): string | null {
  const key = shortcutBankOrder.filter((bank) => selectedBanks.includes(bank)).join('+');

  return shortcutUrls[key] ?? null;
}
