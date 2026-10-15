const shortcutUrls: Record<string, string> = {
  millennium: 'https://www.icloud.com/shortcuts/45c335f2b7ad450885f9613939fe7b1f',
  pko: 'https://www.icloud.com/shortcuts/fc6262c04b8c4a218b88a9a92ce8f381',
  'millennium+pko': 'https://www.icloud.com/shortcuts/8920bdb2274d4782b71ae72b1732ea0e',
  ing: 'https://www.icloud.com/shortcuts/5b288903ffb54dcc81855d2cd6708c10',
  'pko+ing': 'https://www.icloud.com/shortcuts/0670b6ddc85b4414aa1f258704a5f3e5',
  'millennium+ing': 'https://www.icloud.com/shortcuts/c763e56eaf82408a9aaab02829893a0d',
  'millennium+pko+ing': 'https://www.icloud.com/shortcuts/773e06a3ce0f4030ab224290847c435d',
  mbank: 'https://www.icloud.com/shortcuts/989e494fd2ba4616bf0ec8882e4ae588',
  'pko+mbank': 'https://www.icloud.com/shortcuts/a1a0fbe99ccb4be2bd9a2260560f0a0f',
  'ing+mbank': 'https://www.icloud.com/shortcuts/1b207fe5db114930819eb25568de16ad',
  'millennium+mbank': 'https://www.icloud.com/shortcuts/bdcb39305ccc42a1bd7a0c8ada00b692',
  'millennium+pko+mbank': 'https://www.icloud.com/shortcuts/03df27ce98ca4bec91ff443a70c65a00',
  'pko+ing+mbank': 'https://www.icloud.com/shortcuts/d91a07d24ac847918da222f10f0c87e3',
  'millennium+ing+mbank': 'https://www.icloud.com/shortcuts/c5570d68a62e4e21b63bd5160a8551eb',
  'millennium+pko+ing+mbank': 'https://www.icloud.com/shortcuts/3630b8160ef5414ead8cd73409084683',
};

const shortcutBankOrder = ['millennium', 'pko', 'ing', 'mbank'];

export function shortcutUrlFor(selectedBanks: string[]): string | null {
  const key = shortcutBankOrder.filter((bank) => selectedBanks.includes(bank)).join('+');

  return shortcutUrls[key] ?? null;
}
