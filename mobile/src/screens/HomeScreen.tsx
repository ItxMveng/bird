import React from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { mockData } from '../services/api';
import { Auction } from '../types';

export function HomeScreen({
  onOpenAuction,
  onOpenWallet,
  onOpenCreateAuction,
  onOpenTransactions,
}: {
  onOpenAuction: (auction: Auction) => void;
  onOpenWallet: () => void;
  onOpenCreateAuction: () => void;
  onOpenTransactions: () => void;
}) {
  return (
    <ScreenLayout title="Enchères actives">
      <View style={styles.row}>
        <Button title="Wallet" onPress={onOpenWallet} />
        <Button title="Créer" onPress={onOpenCreateAuction} />
        <Button title="Transactions" onPress={onOpenTransactions} />
      </View>
      {mockData.auctions.map((auction) => (
        <Pressable key={auction.id} style={styles.card} onPress={() => onOpenAuction(auction)}>
          <Text style={styles.title}>{auction.title}</Text>
          <Text>{auction.city}</Text>
          <Text style={styles.price}>{auction.currentPrice.toLocaleString()} XAF</Text>
          <Text style={styles.meta}>Catégorie: {auction.category}</Text>
        </Pressable>
      ))}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 6 },
  title: { fontWeight: '700', fontSize: 16 },
  price: { fontWeight: '700', color: '#065f46' },
  meta: { color: '#6b7280', fontSize: 12 },
});
