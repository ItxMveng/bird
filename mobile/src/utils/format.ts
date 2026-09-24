export const formatXaf = (value: number) =>
  `${Math.round(value).toLocaleString()} XAF`;

export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getHoursLeft = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
};

/** Doit rester aligné avec minBidIncrement() côté functions/src/domain.ts. */
export const minBidIncrement = (currentPrice: number) => {
  if (currentPrice < 20_000) return 500;
  if (currentPrice < 100_000) return 1_000;
  if (currentPrice < 500_000) return 5_000;
  return 10_000;
};
