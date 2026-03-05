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
  onOpenSearch,
  onOpenMessages,
  onOpenNotifications,
  onOpenRatings,
  onOpenPro,
  onOpenAdmin,
}: {
  onOpenAuction: (auction: Auction) => void;
  onOpenWallet: () => void;
  onOpenCreateAuction: () => void;
  onOpenTransactions: () => void;
  onOpenSearch: () => void;
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
  onOpenRatings: () => void;
  onOpenPro: () => void;
  onOpenAdmin: () => void;
}) {
  return (
    <ScreenLayout title="Enchères actives">
      <View style={styles.rowWrap}>
        <Button title="Wallet" onPress={onOpenWallet} />
        <Button title="Créer" onPress={onOpenCreateAuction} />
        <Button title="Transactions" onPress={onOpenTransactions} />
        <Button title="Recherche" onPress={onOpenSearch} />
        <Button title="Messages" onPress={onOpenMessages} />
        <Button title="Notif" onPress={onOpenNotifications} />
        <Button title="Notes" onPress={onOpenRatings} />
        <Button title="PRO" onPress={onOpenPro} />
        <Button title="Admin" onPress={onOpenAdmin} />
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
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 6 },
  title: { fontWeight: '700', fontSize: 16 },
  price: { fontWeight: '700', color: '#065f46' },
  meta: { color: '#6b7280', fontSize: 12 },
});
