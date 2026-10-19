import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ChoiceOption<T> {
  label: string;
  value: T;
  hint?: string;
}

interface ChoiceListProps<T> {
  options: ChoiceOption<T>[];
  onSelect: (value: T) => void;
}

// Mexican Government & INE Institutional Choice List
export function ChoiceList<T>({ options, onSelect }: ChoiceListProps<T>) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.label}
          style={styles.option}
          activeOpacity={0.8}
          onPress={() => onSelect(o.value)}
        >
          <View style={styles.textContainer}>
            <Text style={styles.label}>{o.label}</Text>
            {o.hint ? <Text style={styles.hint}>{o.hint}</Text> : null}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },
  option: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    borderLeftColor: '#9F2241', // Guinda institucional accent stripe on left
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  chevron: {
    fontSize: 22,
    color: '#BC955C', // Dorado
    fontWeight: '700',
    marginLeft: 10,
  },
});
