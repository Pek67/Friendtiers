const TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
const MAX_RANKINGS = 20;
const LOCAL_STORAGE_KEY = 'rankings-data';
const ADMIN_SESSION_KEY = 'friendtiers-admin-unlocked';
const SUPABASE_TABLE = 'friendtiers_state';
const SUPABASE_ROW_ID = 'global';

const TIER_COLORS = {
    HT1: '#1a1a1a',
    LT1: '#2d2d2d',
    HT2: '#3a3a3a',
    LT2: '#474747',
    HT3: '#545454',
    LT3: '#616161',
    HT4: '#6e6e6e',
    LT4: '#7b7b7b',
    HT5: '#888888',
    LT5: '#959595'
};

let supabaseClient = null;
let isAdmin = false;

function getSyncStatusElement() {
    return document.getElementById('syncStatus');
}

function getAuthStatusElement() {
    return document.getElementById('authStatus');
}

function getPasswordInputElement() {
    return document.getElementById('adminPasswordInput');
}

function getLoginButtonElement() {
    return document.getElementById('adminLoginButton');
}

function getLogoutButtonElement() {
    return document.getElementById('adminLogoutButton');
}

function getSupabaseConfig() {
    if (!window.FRIENDTIERS_CONFIG) {
        return {
            supabaseUrl: '',
            supabaseAnonKey: '',
            adminPassword: ''
        };
    }

    return {
        supabaseUrl: window.FRIENDTIERS_CONFIG.supabaseUrl || '',
        supabaseAnonKey: window.FRIENDTIERS_CONFIG.supabaseAnonKey || '',
        adminPassword: window.FRIENDTIERS_CONFIG.adminPassword || ''
    };
}

function isPlaceholderValue(value) {
    return !value || value.includes('YOUR_');
}

function isSupabaseConfigured() {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    return !isPlaceholderValue(supabaseUrl) && !isPlaceholderValue(supabaseAnonKey);
}

function getAdminPassword() {
    return getSupabaseConfig().adminPassword;
}

function isAdminConfigured() {
    return !isPlaceholderValue(getAdminPassword());
}

function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw new Error('Supabase-Client konnte nicht geladen werden.');
    }

    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
}

function normalizeTier(tier) {
    return TIERS.includes(tier) ? tier : TIERS[0];
}

function createTierBadge(tier) {
    const normalizedTier = normalizeTier(tier);
    const badge = document.createElement('span');
    badge.className = 'tier-badge';
    badge.style.backgroundColor = TIER_COLORS[normalizedTier];
    badge.textContent = normalizedTier;
    return badge;
}

function createDeleteButton(label, handlerName) {
    const button = document.createElement('button');
    button.className = 'btn-delete';
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('onclick', `${handlerName}(this)`);
    return button;
}

function clearRenderedData() {
    document.getElementById('rankingsBody').innerHTML = '';
    document.getElementById('unrankedList').innerHTML = '';
}

function collectCurrentData() {
    const data = {
        rankings: [],
        unranked: []
    };

    document.querySelectorAll('#rankingsBody tr').forEach((row, index) => {
        const name = row.querySelector('.name-col').textContent;
        const tier = row.querySelector('.tier-badge').textContent.trim();
        data.rankings.push({ rank: index + 1, name, tier });
    });

    document.querySelectorAll('.unranked-item').forEach((item) => {
        const name = item.querySelector('.unranked-name').textContent;
        const tier = item.querySelector('.tier-badge').textContent.trim();
        data.unranked.push({ name, tier });
    });

    return data;
}

function loadLocalData() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) {
        return null;
    }

    return JSON.parse(saved);
}

function saveToLocalCache(data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

function setSyncStatus(message, state) {
    const statusElement = getSyncStatusElement();
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function setAuthStatus(message, state) {
    const statusElement = getAuthStatusElement();
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function updateAdminMode(nextIsAdmin) {
    isAdmin = nextIsAdmin;
    document.body.classList.toggle('admin-mode', nextIsAdmin);
    document.body.classList.toggle('viewer-mode', !nextIsAdmin);

    const passwordInput = getPasswordInputElement();
    const loginButton = getLoginButtonElement();
    const logoutButton = getLogoutButtonElement();

    if (passwordInput) {
        passwordInput.hidden = nextIsAdmin;
        passwordInput.value = '';
    }

    if (loginButton) {
        loginButton.hidden = nextIsAdmin;
    }

    if (logoutButton) {
        logoutButton.hidden = !nextIsAdmin;
    }

    if (nextIsAdmin) {
        setAuthStatus('Admin-Modus aktiv.', 'success');
        return;
    }

    if (!isAdminConfigured()) {
        setAuthStatus('Admin-Passwort ist noch nicht konfiguriert.', 'warning');
        return;
    }

    setAuthStatus('Nur Ansicht aktiv. Zum Bearbeiten Passwort eingeben.', 'info');
}

function restoreAdminSession() {
    updateAdminMode(sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true');
}

function loginAsAdmin() {
    if (!isAdminConfigured()) {
        setAuthStatus('Admin-Passwort fehlt in der Konfiguration.', 'warning');
        return;
    }

    const passwordInput = getPasswordInputElement();
    const enteredPassword = passwordInput ? passwordInput.value : '';

    if (enteredPassword !== getAdminPassword()) {
        setAuthStatus('Falsches Passwort.', 'error');
        if (passwordInput) {
            passwordInput.focus();
            passwordInput.select();
        }
        return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    updateAdminMode(true);
}

function logoutAdmin() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    updateAdminMode(false);
}

function requireAdminAction() {
    if (isAdmin) {
        return true;
    }

    alert('Nur mit dem Admin-Passwort kannst du die Liste bearbeiten.');
    return false;
}

async function saveToSupabase(data) {
    const client = getSupabaseClient();
    const payload = {
        id: SUPABASE_ROW_ID,
        rankings: data.rankings,
        unranked: data.unranked,
        updated_at: new Date().toISOString()
    };

    const { error } = await client
        .from(SUPABASE_TABLE)
        .upsert(payload, { onConflict: 'id' });

    if (error) {
        throw error;
    }
}

async function loadFromSupabase() {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from(SUPABASE_TABLE)
        .select('rankings, unranked')
        .eq('id', SUPABASE_ROW_ID)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

function addPlayer() {
    if (!requireAdminAction()) {
        return;
    }

    const nameInput = document.getElementById('nameInput');
    const tierSelect = document.getElementById('tierSelect');
    const name = nameInput.value.trim();
    const tier = normalizeTier(tierSelect.value);

    if (!name) {
        alert('Bitte einen Namen eingeben!');
        return;
    }

    const tbody = document.getElementById('rankingsBody');

    if (tbody.children.length < MAX_RANKINGS) {
        addToRankings(name, tier);
    } else {
        addToUnranked(name, tier);
    }

    nameInput.value = '';
    nameInput.focus();
    saveState();
}

function addToRankings(name, tier) {
    const tbody = document.getElementById('rankingsBody');
    const rank = tbody.children.length + 1;

    const row = document.createElement('tr');
    row.className = 'ranking-row';

    const rankCell = document.createElement('td');
    rankCell.className = 'rank-col';
    rankCell.textContent = `🏆 ${rank}`;

    const nameCell = document.createElement('td');
    nameCell.className = 'name-col';
    nameCell.textContent = name;

    const tierCell = document.createElement('td');
    tierCell.className = 'tier-col';
    tierCell.appendChild(createTierBadge(tier));

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-col admin-actions';
    actionsCell.appendChild(createDeleteButton('✕', 'deleteRankingRow'));

    row.appendChild(rankCell);
    row.appendChild(nameCell);
    row.appendChild(tierCell);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
}

function addToUnranked(name, tier) {
    const unrankedList = document.getElementById('unrankedList');

    const item = document.createElement('div');
    item.className = 'unranked-item';

    const nameElement = document.createElement('span');
    nameElement.className = 'unranked-name';
    nameElement.textContent = name;

    const actionsElement = document.createElement('div');
    actionsElement.className = 'unranked-actions admin-actions';
    actionsElement.appendChild(createDeleteButton('⬆️', 'moveToRankings'));
    actionsElement.appendChild(createDeleteButton('✕', 'deleteUnranked'));

    item.appendChild(nameElement);
    item.appendChild(createTierBadge(tier));
    item.appendChild(actionsElement);

    unrankedList.appendChild(item);
}

function moveToRankings(button) {
    if (!requireAdminAction()) {
        return;
    }

    const tbody = document.getElementById('rankingsBody');
    if (tbody.children.length >= MAX_RANKINGS) {
        alert(`Die Rankings sind voll. Maximal ${MAX_RANKINGS} Eintraege moeglich.`);
        return;
    }

    const item = button.closest('.unranked-item');
    const name = item.querySelector('.unranked-name').textContent;
    const tier = item.querySelector('.tier-badge').textContent.trim();

    item.remove();
    addToRankings(name, tier);
    saveState();
}

function deleteRankingRow(button) {
    if (!requireAdminAction()) {
        return;
    }

    button.closest('tr').remove();
    updateRankNumbers();
    saveState();
}

function deleteUnranked(button) {
    if (!requireAdminAction()) {
        return;
    }

    button.closest('.unranked-item').remove();
    saveState();
}

function updateRankNumbers() {
    const rows = document.querySelectorAll('#rankingsBody tr');
    rows.forEach((row, index) => {
        row.querySelector('.rank-col').textContent = `🏆 ${index + 1}`;
    });
}

function clearAll() {
    if (!requireAdminAction()) {
        return;
    }

    if (!confirm('Moechtest du wirklich alles loeschen?')) {
        return;
    }

    clearRenderedData();
    saveState();
}

async function saveState() {
    if (!isAdmin) {
        setSyncStatus('Nur mit dem Admin-Passwort darf gespeichert werden.', 'warning');
        return;
    }

    const data = collectCurrentData();
    saveToLocalCache(data);

    if (!isSupabaseConfigured()) {
        setSyncStatus('Supabase ist nicht konfiguriert.', 'warning');
        return;
    }

    try {
        setSyncStatus('Synchronisiere...', 'info');
        await saveToSupabase(data);
        setSyncStatus('Online gespeichert.', 'success');
    } catch (error) {
        console.error('Fehler beim Speichern in Supabase:', error);
        setSyncStatus('Speichern in Supabase fehlgeschlagen.', 'error');
    }
}

function renderLoadedData(data) {
    const rankings = Array.isArray(data && data.rankings) ? data.rankings : [];
    const unranked = Array.isArray(data && data.unranked) ? data.unranked : [];

    clearRenderedData();

    rankings.forEach((item) => {
        addToRankings(item.name, item.tier);
    });

    unranked.forEach((item) => {
        addToUnranked(item.name, item.tier);
    });
}

async function loadSavedData() {
    const localData = loadLocalData();

    if (!isSupabaseConfigured()) {
        if (localData) {
            renderLoadedData(localData);
        }
        setSyncStatus('Supabase ist nicht konfiguriert.', 'warning');
        return;
    }

    try {
        setSyncStatus('Lade gemeinsame Liste...', 'info');
        const remoteData = await loadFromSupabase();

        if (remoteData) {
            renderLoadedData(remoteData);
            saveToLocalCache(remoteData);
            setSyncStatus('Gemeinsame Liste geladen.', 'success');
            return;
        }

        if (localData) {
            renderLoadedData(localData);
            setSyncStatus('Lokale Daten geladen.', 'warning');
            return;
        }

        setSyncStatus('Bereit - die gemeinsame Liste ist noch leer.', 'info');
    } catch (error) {
        console.error('Fehler beim Laden aus Supabase:', error);

        if (localData) {
            renderLoadedData(localData);
            setSyncStatus('Supabase nicht erreichbar - lokale Daten geladen.', 'warning');
            return;
        }

        setSyncStatus('Supabase konnte nicht geladen werden.', 'error');
    }
}

function bindAdminActions() {
    const loginButton = getLoginButtonElement();
    const logoutButton = getLogoutButtonElement();
    const passwordInput = getPasswordInputElement();

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            loginAsAdmin();
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logoutAdmin();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                loginAsAdmin();
            }
        });
    }
}

async function initializeApp() {
    const nameInput = document.getElementById('nameInput');
    nameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addPlayer();
        }
    });

    bindAdminActions();
    restoreAdminSession();
    await loadSavedData();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch((error) => {
        console.error('Initialisierung fehlgeschlagen:', error);
        setAuthStatus('Initialisierung fehlgeschlagen.', 'error');
        setSyncStatus('Die Seite konnte nicht komplett geladen werden.', 'error');
    });
});
