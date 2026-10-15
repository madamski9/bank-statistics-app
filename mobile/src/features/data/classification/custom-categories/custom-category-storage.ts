import { documentList } from '@/features/data/local-storage/document-list';
import { encryptedDocument } from '@/features/data/local-storage/encrypted-document';

import { isCustomCategory } from './custom-category';

const customCategoriesDocument = encryptedDocument('bankstats.custom-categories.v1');

export const customCategoryStore = documentList(customCategoriesDocument, isCustomCategory);

export function clearCustomCategories(): Promise<void> {
  return customCategoriesDocument.clear();
}
