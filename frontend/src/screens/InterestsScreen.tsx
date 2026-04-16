// frontend/src/screens/InterestsScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
// 👇 1. Importamos la herramienta para los bordes del celular
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { COLORS } from '../theme/colors';
import { SIMPLE_CATEGORIES } from '../data/categories';

export default function InterestsScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string[]>([]);
  
  // 👇 2. Medimos cuánto espacio ocupan los botones del sistema
  const insets = useSafeAreaInsets();

  const toggleInterest = (interest: string) => {
    if (selected.includes(interest)) {
      setSelected(selected.filter(item => item !== interest));
    } else {
      setSelected([...selected, interest]);
    }
  };

  return (
    // 👇 3. Le agregamos el espacio dinámico abajo (insets.bottom) al contenedor
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
      <Text style={styles.headerTitle}>¿Qué te gusta?</Text>
      <Text style={styles.subtitle}>Elige al menos uno para personalizar tu feed</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {SIMPLE_CATEGORIES.map((interest: string) => {
          const isSelected = selected.includes(interest);
          return (
            <TouchableOpacity
              key={interest}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => toggleInterest(interest)}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {interest}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selected.length > 0 && (
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={() => navigation.replace('PreLoad')} 
        >
          <Text style={styles.continueText}>Continuar al Feed</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 60 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 5 },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginRight: 10,
  },
  pillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  pillText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  pillTextSelected: { color: COLORS.text },
  continueButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    // Eliminamos el marginBottom de 20 de aquí para que el paddingBottom dinámico haga el trabajo
  },
  continueText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
});