import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AuctionDetailScreen } from './src/screens/AuctionDetailScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { CreateAuctionScreen } from './src/screens/CreateAuctionScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { TransactionDetailScreen } from './src/screens/TransactionDetailScreen';
import { DisputeScreen } from './src/screens/DisputeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { Auction, Transaction } from './src/types';

type Route = 'home' | 'auction' | 'wallet' | 'create' | 'transactions' | 'transactionDetail' | 'dispute' | 'profile';

function AppInner() {
  const { user } = useAuth();
  const [route, setRoute] = useState<Route>('home');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      {route === 'home' && (
        <HomeScreen
          onOpenAuction={(auction) => {
            setSelectedAuction(auction);
            setRoute('auction');
          }}
          onOpenWallet={() => setRoute('wallet')}
          onOpenCreateAuction={() => setRoute('create')}
          onOpenTransactions={() => setRoute('transactions')}
        />
      )}

      {route === 'auction' && selectedAuction && (
        <AuctionDetailScreen auction={selectedAuction} onBack={() => setRoute('home')} />
      )}

      {route === 'wallet' && <WalletScreen onBack={() => setRoute('home')} />}

      {route === 'create' && <CreateAuctionScreen onBack={() => setRoute('home')} />}

      {route === 'transactions' && (
        <TransactionsScreen
          onBack={() => setRoute('home')}
          onOpenTransaction={(tx) => {
            setSelectedTransaction(tx);
            setRoute('transactionDetail');
          }}
        />
      )}

      {route === 'transactionDetail' && selectedTransaction && (
        <TransactionDetailScreen
          transaction={selectedTransaction}
          onBack={() => setRoute('transactions')}
          onOpenDispute={(tx) => {
            setSelectedTransaction(tx);
            setRoute('dispute');
          }}
        />
      )}

      {route === 'dispute' && selectedTransaction && (
        <DisputeScreen transaction={selectedTransaction} onBack={() => setRoute('transactionDetail')} />
      )}

      {route === 'profile' && <ProfileScreen onBack={() => setRoute('home')} />}

      <View style={styles.bottomBar}>
        <Button title="Accueil" onPress={() => setRoute('home')} />
        <Button title="Profil" onPress={() => setRoute('profile')} />
      </View>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
});
