# Firestore Schema V1

## Collections principales

### `users/{uid}`
- `uid: string`
- `phone: string`
- `role: 'user' | 'admin'`
- `isPro: boolean`
- `status: 'active' | 'suspended'`
- `createdAt: timestamp`

### `profiles/{uid}`
- `uid: string`
- `name: string`
- `city: string`
- `rating: number`
- `verified: boolean`

### `wallets/{uid}`
- `uid: string`
- `balance: number`
- `blocked: number`
- `currency: 'XAF'`
- `updatedAt: timestamp`

### `wallet_transactions/{txId}`
- `walletId: string`
- `type: 'recharge' | 'block' | 'release' | 'commission' | 'refund'`
- `amount: number`
- `status: 'pending' | 'success' | 'failed'`
- `reference: string`
- `traceId: string`
- `createdAt: timestamp`

### `auctions/{auctionId}`
- `sellerId: string`
- `title: string`
- `description: string`
- `category: 'phones' | 'electronics' | 'moto' | 'appliances'`
- `startPrice: number`
- `currentPrice: number`
- `status: 'draft' | 'active' | 'closed_unsold' | 'closed_sold' | 'cancelled'`
- `endAt: timestamp`
- `city: string`
- `winnerBidId?: string`

### `bids/{bidId}`
- `auctionId: string`
- `bidderId: string`
- `amount: number`
- `idempotencyKey: string`
- `createdAt: timestamp`

### `transactions/{transactionId}`
- `auctionId: string`
- `buyerId: string`
- `sellerId: string`
- `amount: number`
- `status: 'blocked' | 'delivered' | 'confirmed' | 'dispute' | 'refunded'`
- `secretCodeHash: string`
- `expiresAt: timestamp`

### `disputes/{disputeId}`
- `transactionId: string`
- `openedBy: 'buyer' | 'seller'`
- `reason: string`
- `status: 'open' | 'resolved'`
- `resolution?: 'refund' | 'pay_seller'`

### `payouts/{payoutId}`
- `sellerId: string`
- `transactionId: string`
- `grossAmount: number`
- `commissionAmount: number`
- `netAmount: number`
- `status: 'pending' | 'paid' | 'failed'`

### `logs/{logId}`
- `actorId: string`
- `action: string`
- `targetType: string`
- `targetId: string`
- `traceId: string`
- `createdAt: timestamp`


### `idempotency/{key}`
- `scope: string`
- `key: string`
- `createdAt: timestamp`

## Champs server-only

`wallets.balance`, `wallets.blocked`, `transactions.status`, `transactions.secretCodeHash`, `auctions.winnerBidId`, `wallet_transactions.*`, `idempotency.*`.
