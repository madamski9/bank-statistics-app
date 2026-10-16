const shortcutUrls: Record<string, string> = {
  millennium: 'https://www.icloud.com/shortcuts/51141e5363284d27b912bc7cfc6ef78e',
  pko: 'https://www.icloud.com/shortcuts/512f1cf0bab546a18915fd870208a659',
  'millennium+pko': 'https://www.icloud.com/shortcuts/a75d53a89cb7444fb7dc8d13f95fa746',
  ing: 'https://www.icloud.com/shortcuts/30c772239f0f424ca1122c4981c0c872',
  'pko+ing': 'https://www.icloud.com/shortcuts/ae3ad3357cb44b8fb580ee2e73f0f3f7',
  'millennium+ing': 'https://www.icloud.com/shortcuts/3b998d231cb74fa58210b37c34eb66c4',
  'millennium+pko+ing': 'https://www.icloud.com/shortcuts/3a3ef3e991e2436fadc30adef065f75e',
  mbank: 'https://www.icloud.com/shortcuts/71c04a24f39b49189a74c93afd7ef428',
  'pko+mbank': 'https://www.icloud.com/shortcuts/eb69dc71732444b39787c011afb6613c',
  'ing+mbank': 'https://www.icloud.com/shortcuts/e6c859ae1ad948a7ac6d0bc59182d08e',
  'millennium+mbank': 'https://www.icloud.com/shortcuts/fc812d66fe134e94bf0024ffda882641',
  'millennium+pko+mbank': 'https://www.icloud.com/shortcuts/0ce2aef5e1ef4129b70fd891c90cafee',
  'pko+ing+mbank': 'https://www.icloud.com/shortcuts/435b9d93616941f8bce2995bd1d69785',
  'millennium+ing+mbank': 'https://www.icloud.com/shortcuts/1733b1c9724c45898667e7d581f9f419',
  'millennium+pko+ing+mbank': 'https://www.icloud.com/shortcuts/ac848cfcdff9495cacd509cc747954fe',
};

const shortcutBankOrder = ['millennium', 'pko', 'ing', 'mbank'];

export function shortcutUrlFor(selectedBanks: string[]): string | null {
  const key = shortcutBankOrder.filter((bank) => selectedBanks.includes(bank)).join('+');

  return shortcutUrls[key] ?? null;
}
