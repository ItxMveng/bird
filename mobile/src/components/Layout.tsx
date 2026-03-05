import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export function ScreenLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f8fa' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#111827' },
  title: { color: 'white', fontWeight: '700', fontSize: 18 },
  content: { padding: 16, gap: 12 },
});
