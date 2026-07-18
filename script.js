const TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
const MAX_RANKINGS = 20;
const LOCAL_STORAGE_KEY = 'rankings-data';
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

function getSyncStatusElement() {
    return document.getElementById('syncStatus');
}

function setSyncStatus(message, state) {
    const statusElement = getSyncStatusElement();
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function getSupabaseConfig() {
    if (!window.FRIENDTIERS_CONFIG) {
        return { supabaseUrl: '', supabaseAnonKey: '' };
    }

    return {
        supabaseUrl: window.FRIENDTIERS_CONFIG.supabaseUrl || '',
        supabaseAnonKey: window.FRIENDTIERS_CONFIG.supabaseAnonKey || ''
    };
}

function isPlaceholderValue(value) {
    return !value || value.includes('YOUR_');
}

function isSupabaseConfigured() {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    return !isPlaceholderValue(supabaseUrl) && !isPlaceholderValue(supabaseAnonKey);
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
    actionsCell.className = 'actions-col';
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

    item.appendChild(nameElement);
    item.appendChild(createTierBadge(tier));
    item.appendChild(createDeleteButton('⬆️', 'moveToRankings'));
    item.appendChild(createDeleteButton('✕', 'deleteUnranked'));

    unrankedList.appendChild(item);
}

function moveToRankings(button) {
    const tbody = document.getElementById('rankingsBody');
    if (tbody.children.length >= MAX_RANKINGS) {
        alert(`Die Rankings sind voll. Maximal ${MAX_RANKINGS} Einträge möglich.`);
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
    button.closest('tr').remove();
    updateRankNumbers();
    saveState();
}

function deleteUnranked(button) {
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
    if (!confirm('Möchtest du wirklich alles löschen?')) {
        return;
    }

    clearRenderedData();
    saveState();
}

async function saveState() {
    const data = collectCurrentData();
    saveToLocalCache(data);

    if (!isSupabaseConfigured()) {
        setSyncStatus('Nur lokal gespeichert – trage zuerst deine Supabase-Daten ein.', 'warning');
        return;
    }

    try {
        setSyncStatus('Synchronisiere...', 'info');
        await saveToSupabase(data);
        setSyncStatus('Online gespeichert.', 'success');
    } catch (error) {
        console.error('Fehler beim Speichern in Supabase:', error);
        setSyncStatus('Speichern in Supabase fehlgeschlagen – lokale Kopie bleibt erhalten.', 'error');
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
        setSyncStatus('Supabase noch nicht eingerichtet – aktuell nur lokal gespeichert.', 'warning');
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
            await saveToSupabase(localData);
            setSyncStatus('Lokale Daten nach Supabase migriert.', 'success');
            return;
        }

        setSyncStatus('Bereit – die gemeinsame Liste ist noch leer.', 'info');
    } catch (error) {
        console.error('Fehler beim Laden aus Supabase:', error);

        if (localData) {
            renderLoadedData(localData);
            setSyncStatus('Supabase nicht erreichbar – lokale Daten geladen.', 'warning');
            return;
        }

        setSyncStatus('Supabase konnte nicht geladen werden.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('nameInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addPlayer();
        }
    });

    await loadSavedData();
});
