import { useEffect, useState, type ReactNode } from 'react';

import { LoadingScreen } from '@/features/brand/loading-screen';

import { deviceLanguage, setCurrentLanguage } from './language';
import { readStoredLanguage } from './language-storage';

interface LanguageBootstrapProps {
  children: ReactNode;
}

export function LanguageBootstrap({ children }: LanguageBootstrapProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    void readStoredLanguage().then((stored) => {
      if (!isActive) {
        return;
      }

      setCurrentLanguage(stored ?? deviceLanguage());
      setIsReady(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return isReady ? children : <LoadingScreen />;
}
