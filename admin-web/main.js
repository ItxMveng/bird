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
const globalFeedback = document.getElementById('globalFeedback');

const state = {
  disputes: [],
  auctions: [],
  users: [],
  search: {
    disputes: '',
    auctions: '',
    users: '',
  },
  limit: 50,
};

function setFeedback(message, isError = false) {
  globalFeedback.textContent = message;
  globalFeedback.style.color = isError ? '#fca5a5' : '#93c5fd';
}

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

  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      throw new Error('Accès refusé: compte non admin ou session expirée.');
    }
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  return payload.result;
}

function tableRowsOrEmpty(rowsHtml, emptyMessage) {
  return rowsHtml.length > 0 ? rowsHtml.join('') : `<tr><td colspan="99" class="muted">${emptyMessage}</td></tr>`;
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
      ${tableRowsOrEmpty(result.recentWalletTransactions.map((tx) => `<tr><td>${tx.walletId}</td><td>${tx.type}</td><td>${tx.amount}</td><td><span class="badge">${tx.status}</span></td></tr>`), 'Aucune recharge récente')}
    </tbody></table>
  `;
}

function renderDisputes() {
  const panel = document.getElementById('disputes');
  const rows = state.disputes
    .filter((d) => `${d.id} ${d.status} ${d.reason}`.toLowerCase().includes(state.search.disputes.toLowerCase()))
    .map((d) => `
      <tr>
        <td>${d.id}</td>
        <td>${d.status}</td>
        <td>${d.reason}</td>
        <td>${d.transactionId}</td>
        <td>
          <button class="ghost" data-resolve="refund" data-id="${d.id}" ${d.status !== 'open' ? 'disabled' : ''}>Refund</button>
          <button class="ghost" data-resolve="pay_seller" data-id="${d.id}" ${d.status !== 'open' ? 'disabled' : ''}>Pay seller</button>
        </td>
      </tr>
    `);

  panel.innerHTML = `
    <h3>Litiges</h3>
    <div class="toolbar">
      <input id="searchDisputes" placeholder="Rechercher (id, statut, raison)" value="${state.search.disputes}" />
    </div>
    <table class="table"><thead><tr><th>ID</th><th>Status</th><th>Raison</th><th>Transaction</th><th>Actions</th></tr></thead>
    <tbody>${tableRowsOrEmpty(rows, 'Aucun litige')}</tbody>
    </table>
  `;

  panel.querySelector('#searchDisputes').addEventListener('input', (e) => {
    state.search.disputes = e.target.value;
    renderDisputes();
  });

  panel.querySelectorAll('button[data-resolve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const disputeId = btn.dataset.id;
      const resolution = btn.dataset.resolve;
      setFeedback(`Résolution ${resolution} en cours...`);
      try {
        await callFn('resolveDispute', { disputeId, resolution });
        setFeedback(`Litige ${disputeId} résolu (${resolution}).`);
        await loadDashboard();
      } catch (e) {
        setFeedback(e.message, true);
      }
    });
  });
}

function renderAuctions() {
  const panel = document.getElementById('auctions');
  const rows = state.auctions
    .filter((a) => `${a.id} ${a.status} ${a.sellerId}`.toLowerCase().includes(state.search.auctions.toLowerCase()))
    .map((a) => `<tr><td>${a.id}</td><td>${a.status}</td><td>${a.currentPrice ?? ''}</td><td>${a.sellerId}</td><td>${a.category ?? ''}</td></tr>`);

  panel.innerHTML = `
    <h3>Enchères</h3>
    <div class="toolbar">
      <input id="searchAuctions" placeholder="Rechercher (id, statut, seller)" value="${state.search.auctions}" />
    </div>
    <table class="table"><thead><tr><th>ID</th><th>Status</th><th>Prix</th><th>Seller</th><th>Catégorie</th></tr></thead>
    <tbody>${tableRowsOrEmpty(rows, 'Aucune enchère')}</tbody></table>
  `;

  panel.querySelector('#searchAuctions').addEventListener('input', (e) => {
    state.search.auctions = e.target.value;
    renderAuctions();
  });
}

function renderUsers() {
  const panel = document.getElementById('users');
  const rows = state.users
    .filter((u) => `${u.id} ${u.role} ${u.status} ${u.email || ''}`.toLowerCase().includes(state.search.users.toLowerCase()))
    .map((u) => {
      const nextStatus = u.status === 'suspended' ? 'active' : 'suspended';
      const actionLabel = nextStatus === 'active' ? 'Réactiver' : 'Suspendre';
      return `
        <tr>
          <td>${u.id}</td>
          <td>${u.role ?? 'user'}</td>
          <td>${u.status ?? 'active'}</td>
          <td>${u.email || ''}</td>
          <td><button class="ghost" data-user-id="${u.id}" data-status="${nextStatus}">${actionLabel}</button></td>
        </tr>
      `;
    });

  panel.innerHTML = `
    <h3>Utilisateurs</h3>
    <div class="toolbar">
      <input id="searchUsers" placeholder="Rechercher (uid, rôle, status, email)" value="${state.search.users}" />
    </div>
    <table class="table"><thead><tr><th>UID</th><th>Role</th><th>Status</th><th>Email</th><th>Action</th></tr></thead>
    <tbody>${tableRowsOrEmpty(rows, 'Aucun utilisateur')}</tbody></table>
  `;

  panel.querySelector('#searchUsers').addEventListener('input', (e) => {
    state.search.users = e.target.value;
    renderUsers();
  });

  panel.querySelectorAll('button[data-user-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetUid = btn.dataset.userId;
      const status = btn.dataset.status;
      setFeedback(`Mise à jour utilisateur ${targetUid}...`);
      try {
        await callFn('adminSetUserStatus', { targetUid, status });
        setFeedback(`Utilisateur ${targetUid} => ${status}`);
        await loadDashboard();
      } catch (e) {
        setFeedback(e.message, true);
      }
    });
  });
}

async function loadDashboard() {
  setFeedback('Chargement dashboard...');
  const [overview, disputes, auctions, users] = await Promise.all([
    callFn('adminOverview'),
    callFn('adminListDisputes', { limit: state.limit }),
    callFn('adminListAuctions', { limit: state.limit }),
    callFn('adminListUsers', { limit: state.limit }),
  ]);

  state.disputes = disputes.disputes || [];
  state.auctions = auctions.auctions || [];
  state.users = users.users || [];

  renderOverview(overview);
  renderDisputes();
  renderAuctions();
  renderUsers();
  setFeedback('Dashboard synchronisé.');
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
    setFeedback('', false);
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  dashboard.classList.add('hidden');
  authCard.classList.remove('hidden');
  setFeedback('Déconnecté.');
});
