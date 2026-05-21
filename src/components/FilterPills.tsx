import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '../theme';

interface FilterOption {
  id: string;
  label: string;
}

interface FilterPillsProps {
  options: FilterOption[];
  selectedValue: string;
  onSelect: (id: string) => void;
}

export default function FilterPills({ options, selectedValue, onSelect }: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = selectedValue === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(option.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.text, isSelected && styles.textSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm, // Fallback for systems that don't support gap
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  text: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  textSelected: {
    color: Colors.surface,
  },
});
