import { useCopy } from '@/features/app-shell/localization/language';
import {
  categoryOptions,
  uncategorizedCategory,
  uncategorizedLabel,
} from '@/features/data/classification/categories';
import { customCategoriesCopy } from '@/features/data/classification/custom-categories/custom-categories-copy';
import { selectionChanged } from '@/haptics';

import { transactionsCopy } from '../../transactions-copy';
import { ChoiceChip, ChoiceGroup } from './choice-chip';
import { RememberCategoryToggle } from './remember-category-toggle';

interface CategoryPickerProps {
  category: string;
  merchantName: string;
  canAddCategory: boolean;
  canRemember: boolean;
  isRemembering: boolean;
  onSelect: (category: string) => void;
  onAddCategory: () => void;
  onToggleRemember: () => void;
}

export function CategoryPicker({
  category,
  merchantName,
  canAddCategory,
  canRemember,
  isRemembering,
  onSelect,
  onAddCategory,
  onToggleRemember,
}: CategoryPickerProps) {
  const copy = useCopy(transactionsCopy);
  const categoryCopy = useCopy(customCategoriesCopy);
  const options = [{ id: uncategorizedCategory, label: uncategorizedLabel() }, ...categoryOptions()];

  return (
    <ChoiceGroup
      footer={canRemember ? (
        <RememberCategoryToggle
          isOn={isRemembering}
          label={copy.rememberCategory(merchantName.trim())}
          onPress={() => {
            selectionChanged();
            onToggleRemember();
          }}
        />
      ) : null}
      label={copy.category}
    >
      {options.map((option) => (
        <ChoiceChip
          isActive={option.id === category}
          key={option.id}
          label={option.label}
          onPress={() => {
            selectionChanged();
            onSelect(option.id);
          }}
        />
      ))}
      {canAddCategory ? (
        <ChoiceChip
          isSelectable={false}
          label={categoryCopy.newChip}
          onPress={() => {
            selectionChanged();
            onAddCategory();
          }}
        />
      ) : null}
    </ChoiceGroup>
  );
}
