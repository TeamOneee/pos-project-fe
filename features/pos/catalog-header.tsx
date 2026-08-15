/**
 * The sticky sub-header above the product grid: search, then category chips.
 *
 * The search input is 48px rather than the usual 44px minimum — it is the most
 * frequently hit target on the busiest screen in the product.
 */

import { Search } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { PosCategory } from '@/features/pos/pos-catalog';
import { cn } from '@/lib/utils';

type CatalogHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
  categories: PosCategory[];
  /** Null is the "Semua" chip, which is active by default. */
  activeCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
};

export function CatalogHeader({
  query,
  onQueryChange,
  categories,
  activeCategoryId,
  onCategoryChange,
}: CatalogHeaderProps) {
  return (
    <View className="gap-md border-b border-border bg-canvas p-lg">
      <View className="justify-center">
        <Input
          value={query}
          onChangeText={onQueryChange}
          placeholder="Cari produk atau SKU…"
          accessibilityLabel="Cari produk atau SKU"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          className="h-12 pl-[44px] type-body"
        />
        <View className="absolute left-md" pointerEvents="none">
          <Icon as={Search} size={20} className="text-fg-subtle" />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-sm pr-lg"
      >
        <CategoryChip
          label="Semua"
          active={activeCategoryId === null}
          onPress={() => onCategoryChange(null)}
        />
        {categories.map((category) => (
          <CategoryChip
            key={category.categoryId}
            label={category.name}
            active={activeCategoryId === category.categoryId}
            onPress={() => onCategoryChange(category.categoryId)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        'min-h-touch justify-center rounded-full px-lg',
        active ? 'bg-accent' : 'border border-border bg-surface active:bg-subtle'
      )}
    >
      <Text variant="label" tone={active ? 'on-accent' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}
