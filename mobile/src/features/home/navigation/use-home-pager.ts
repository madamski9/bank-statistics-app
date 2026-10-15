import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';

import { pageOrder, type PageKey } from './home-pages';

export function useHomePager(initialPage: PageKey) {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [page, setPage] = useState<PageKey>(initialPage);
  const pageIndex = Math.max(pageOrder.indexOf(page), 0);
  const alignedWidth = useRef(width);

  useEffect(() => {
    if (alignedWidth.current === width) {
      return;
    }

    alignedWidth.current = width;
    pagerRef.current?.scrollTo({ x: pageIndex * width, animated: false });
  }, [pageIndex, width]);

  const goToPage = useCallback(
    (next: PageKey) => {
      setPage(next);
      pagerRef.current?.scrollTo({
        x: Math.max(pageOrder.indexOf(next), 0) * width,
        animated: true,
      });
    },
    [width],
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(
      Math.max(Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)), 0),
      pageOrder.length - 1,
    );
    const next = pageOrder[index];

    if (next !== page) {
      setPage(next);
    }
  };

  return {
    page,
    pagerRef,
    width,
    initialOffset: { x: pageOrder.indexOf(initialPage) * width, y: 0 },
    goToPage,
    handleScroll,
  };
}
