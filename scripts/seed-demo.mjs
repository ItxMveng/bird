// Publie des annonces de démonstration via l'API publique (compte vendeur « Bird Démo »).
// Usage : node scripts/seed-demo.mjs [URL_API]
// Les annonces durent 48 h : relancez le script pour rafraîchir la vitrine de démonstration.
const API = process.argv[2] || 'https://bird-roan-six.vercel.app';
const KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyB7l52oP6vwdrcQD0-WsQnEIsphtgW-z48'; // clé web publique
const EMAIL = process.env.DEMO_SELLER_EMAIL || 'demo-vendeur@bird-demo.example.com';
const PASSWORD = process.env.DEMO_SELLER_PASSWORD || 'BirdDemo-2026-vendeur';

const idt = (path, body) =>
  fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  }).then((r) => r.json());

let auth = await idt('signInWithPassword', { email: EMAIL, password: PASSWORD });
if (!auth.idToken) auth = await idt('signUp', { email: EMAIL, password: PASSWORD });
if (!auth.idToken) throw new Error('Connexion du compte vendeur impossible : ' + JSON.stringify(auth));

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
const ITEMS = [
  { title: 'iPhone 13 Pro 128 Go', description: 'Très bon état, batterie 88 %, vendu avec chargeur.', category: 'phones', startPrice: 250000, city: 'Douala', durationHours: 48, imageUrl: img('photo-1632661674596-df8be070a5c5') },
  { title: 'Samsung Galaxy S22', description: 'Écran sans rayure, débloqué tout opérateur, boîte d’origine.', category: 'phones', startPrice: 180000, city: 'Yaoundé', durationHours: 24, imageUrl: img('photo-1610945415295-d9bbf067e59c') },
  { title: 'PC portable Dell XPS 13', description: 'Core i7, 16 Go RAM, SSD 512 Go. Idéal pour le travail et les études.', category: 'electronics', startPrice: 420000, city: 'Yaoundé', durationHours: 48, imageUrl: img('photo-1593642632823-8f785ba67e45') },
  { title: 'Console PS5 + 2 manettes', description: 'Édition standard, 3 jeux inclus, très peu servie.', category: 'electronics', startPrice: 300000, city: 'Douala', durationHours: 12, imageUrl: img('photo-1606813907291-d86efa9b94db') },
  { title: 'Moto Yamaha 125 cc', description: 'Papiers à jour, entretien régulier, 18 000 km.', category: 'moto', startPrice: 550000, city: 'Bafoussam', durationHours: 48, imageUrl: img('photo-1558981806-ec527fa84c39') },
  { title: 'Réfrigérateur double porte', description: 'Classe A+, 320 L, garantie constructeur restante.', category: 'appliances', startPrice: 160000, city: 'Douala', durationHours: 24, imageUrl: img('photo-1584568694244-14fbdf83bd30') },
  { title: 'Machine à laver 8 kg', description: 'Chargement frontal, silencieuse, 2 ans d’usage.', category: 'appliances', startPrice: 120000, city: 'Kribi', durationHours: 6, imageUrl: img('photo-1626806787461-102c1bfaaea1') },
];

let created = 0;
for (const item of ITEMS) {
  const res = await fetch(`${API}/publishAuction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.idToken}` },
    body: JSON.stringify({ data: item }),
  });
  const body = await res.json();
  console.log(res.ok ? 'OK  ' : 'FAIL', item.title, res.ok ? body.result.auctionId : JSON.stringify(body));
  if (res.ok) created++;
}
console.log(`${created}/${ITEMS.length} annonces publiées.`);
