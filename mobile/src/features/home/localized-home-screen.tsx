import { useState } from 'react';

import { useLanguage } from '@/features/localization/language';

import { HomeScreen } from './home-screen';

export function LocalizedHomeScreen() {
  const language = useLanguage();
  const [shown, setShown] = useState({ language, hasSwitched: false });

  if (shown.language !== language) {
    setShown({ language, hasSwitched: true });
  }

  return <HomeScreen initialPage={shown.hasSwitched ? 'profile' : 'overview'} key={language} />;
}
