import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: window.BIRD_FIREBASE_API_KEY || '',
  authDomain: window.BIRD_FIREBASE_AUTH_DOMAIN || '',
  projectId: window.BIRD_FIREBASE_PROJECT_ID || 'bird-af69c',
  appId: window.BIRD_FIREBASE_APP_ID || '',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const BASE_URL = window.BIRD_API_BASE_URL || 'https://us-central1-bird-af69c.cloudfunctions.net';

const authCard = document.getElementById('authCard');
const dashboard = document.getElementById('dashboard');
const authFeedback = document.getElementById('authFeedback');

async function callFn(name, data = {}) {
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${BASE_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return payload.result;
}

function renderOverview(result) {
  const panel = document.getElementById('overview');
  panel.innerHTML = `
    <h3>KPIs</h3>
    <div class="kpis">
      <div class="kpi"><strong>${result.kpis.activeAuctions}</strong><div>Enchères actives</div></div>
      <div class="kpi"><strong>${result.kpis.openDisputes}</strong><div>Litiges ouverts</div></div>
      <div class="kpi"><strong>${result.kpis.inFlightTransactions}</strong><div>Transactions en cours</div></div>
    </div>
    <h3>Recharges récentes</h3>
    <table class="table"><thead><tr><th>Wallet</th><th>Type</th><th>Montant</th><th>Status</th></tr></thead>
    <tbody>
      ${result.recentWalletTransactions.map((tx) => `<tr><td>${tx.walletId}</td><td>${tx.type}</td><td>${tx.amount}</td><td><span class="badge">${tx.status}</span></td></tr>`).join('')}
    </tbody></table>
  `;
}

function renderTable(panelId, title, rows, cols) {
  const panel = document.getElementById(panelId);
  panel.innerHTML = `
    <h3>${title}</h3>
    <table class="table"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `;
}

async function loadDashboard() {
  const [overview, disputes, auctions, users] = await Promise.all([
    callFn('adminOverview'),
    callFn('adminListDisputes', { limit: 50 }),
    callFn('adminListAuctions', { limit: 50 }),
    callFn('adminListUsers', { limit: 50 }),
  ]);

  renderOverview(overview);
  renderTable('disputes', 'Litiges', disputes.disputes.map((d) => [d.id, d.status, d.reason, d.transactionId]), ['ID', 'Status', 'Raison', 'Transaction']);
  renderTable('auctions', 'Enchères', auctions.auctions.map((a) => [a.id, a.status, a.currentPrice, a.sellerId]), ['ID', 'Status', 'Prix', 'Seller']);
  renderTable('users', 'Utilisateurs', users.users.map((u) => [u.id, u.role, u.status, u.email || '']), ['UID', 'Role', 'Status', 'Email']);
}

for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
  });
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  authFeedback.textContent = 'Connexion...';
  try {
    await signInWithEmailAndPassword(auth, email, password);
    await loadDashboard();
    authCard.classList.add('hidden');
    dashboard.classList.remove('hidden');
    authFeedback.textContent = '';
  } catch (e) {
    authFeedback.textContent = `Erreur: ${e.message}`;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  dashboard.classList.add('hidden');
  authCard.classList.remove('hidden');
});
