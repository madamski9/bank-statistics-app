import { useCallback, useEffect, useState } from 'react';

import { writeForCurrentOwner } from '@/features/data/local-storage/current-owner-writes';

import { setCustomCategories, type CustomCategory } from '../categories';
import { newCustomCategory } from './custom-category';
import { customCategoryStore } from './custom-category-storage';

export interface CustomCategories {
  categories: CustomCategory[];
  create: (name: string) => Promise<CustomCategory>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useCustomCategories(): CustomCategories {
  const [categories, setCategories] = useState<CustomCategory[]>([]);

  const reload = useCallback(async () => {
    const stored = await customCategoryStore.load();
    setCustomCategories(stored);
    setCategories(stored);
  }, []);

  useEffect(() => {
    let isActive = true;

    void customCategoryStore.load().then((stored) => {
      if (isActive) {
        setCustomCategories(stored);
        setCategories(stored);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const create = useCallback(
    async (name: string) => {
      const category = newCustomCategory(name, new Date(), Math.random);
      await writeForCurrentOwner(() => customCategoryStore.upsert(category));
      await reload();

      return category;
    },
    [reload],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await writeForCurrentOwner(() => customCategoryStore.upsert({ id, name: name.trim() }));
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await writeForCurrentOwner(() => customCategoryStore.remove(id));
      await reload();
    },
    [reload],
  );

  return { categories, create, rename, remove, reload };
}
