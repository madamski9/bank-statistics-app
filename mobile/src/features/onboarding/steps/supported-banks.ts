export const supportedBanks = [
  {
    id: 'millennium',
    name: 'Millennium',
    logo: require('../assets/millennium.png'),
    available: true,
  },
  {
    id: 'pko',
    name: 'PKO BP',
    logo: require('../assets/pko.png'),
    available: true,
  },
  {
    id: 'ing',
    name: 'ING',
    logo: require('../assets/ing.png'),
    available: true,
  },
  {
    id: 'mbank',
    name: 'mBank',
    logo: require('../assets/mbank.png'),
    available: false,
  },
  {
    id: 'revolut',
    name: 'Revolut',
    logo: require('../assets/revolut.png'),
    available: false,
  },
] as const;
