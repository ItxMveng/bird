import React, { useMemo, useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { mockData } from '../services/api';
import { Auction, AuctionCategory } from '../types';

const categories: AuctionCategory[] = ['phones', 'electronics', 'moto', 'appliances'];

export function SearchScreen({ onBack, onOpenAuction }: { onBack: () => void; onOpenAuction: (auction: Auction) => void }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<AuctionCategory | 'all'>('all');

  const results = useMemo(() => {
    return mockData.auctions.filter((a) => {
      const q = query.trim().toLowerCase();
      const byQuery = !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      const byCity = !city.trim() || a.city.toLowerCase().includes(city.toLowerCase());
      const byCategory = category === 'all' || a.category === category;
      return byQuery && byCity && byCategory;
    });
  }, [query, city, category]);

  return (
    <ScreenLayout title="Recherche avancée">
      <View style={styles.card}>
        <TextInput value={query} onChangeText={setQuery} style={styles.input} placeholder="Rechercher un produit" />
        <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="Ville" />
        <View style={styles.rowWrap}>
          <Pressable onPress={() => setCategory('all')} style={[styles.tag, category === 'all' && styles.tagActive]}><Text>all</Text></Pressable>
          {categories.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} style={[styles.tag, category === c && styles.tagActive]}><Text>{c}</Text></Pressable>
          ))}
        </View>
      </View>

      {results.map((auction) => (
        <Pressable key={auction.id} style={styles.card} onPress={() => onOpenAuction(auction)}>
          <Text style={styles.title}>{auction.title}</Text>
          <Text>{auction.city}</Text>
          <Text>{auction.currentPrice.toLocaleString()} XAF</Text>
        </Pressable>
      ))}
      <Button title="Retour" onPress={onBack} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
  title: { fontWeight: '700' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 20 },
  tagActive: { backgroundColor: '#bfdbfe' },
});
