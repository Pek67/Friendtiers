const TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
const MAX_RANKINGS = 20;

const TIER_COLORS = {
    'HT1': '#1a1a1a',
    'LT1': '#2d2d2d',
    'HT2': '#3a3a3a',
    'LT2': '#474747',
    'HT3': '#545454',
    'LT3': '#616161',
    'HT4': '#6e6e6e',
    'LT4': '#7b7b7b',
    'HT5': '#888888',
    'LT5': '#959595'
};

function addPlayer() {
    const nameInput = document.getElementById('nameInput');
    const tierSelect = document.getElementById('tierSelect');
    const name = nameInput.value.trim();
    const tier = tierSelect.value;

    if (!name) {
        alert('Bitte einen Namen eingeben!');
        return;
    }

    const tbody = document.getElementById('rankingsBody');
    
    // Wenn noch Platz, direkt in Rankings
    if (tbody.children.length < MAX_RANKINGS) {
        addToRankings(name, tier);
    } else {
        // Sonst zu Unranked
        addToUnranked(name, tier);
    }

    nameInput.value = '';
    nameInput.focus();
    saveToLocalStorage();
}

function addToRankings(name, tier) {
    const tbody = document.getElementById('rankingsBody');
    const rank = tbody.children.length + 1;

    const row = document.createElement('tr');
    row.className = 'ranking-row';
    row.innerHTML = `
        <td class="rank-col">🏆 ${rank}</td>
        <td class="name-col">${name}</td>
        <td class="tier-col">
            <span class="tier-badge" style="background-color: ${TIER_COLORS[tier]}">
                ${tier}
            </span>
        </td>
        <td class="actions-col">
            <button class="btn-delete" onclick="deleteRankingRow(this)">✕</button>
        </td>
    `;

    tbody.appendChild(row);
}

function addToUnranked(name, tier) {
    const unrankedList = document.getElementById('unrankedList');
    
    const item = document.createElement('div');
    item.className = 'unranked-item';
    item.innerHTML = `
        <span class="unranked-name">${name}</span>
        <span class="tier-badge" style="background-color: ${TIER_COLORS[tier]}">
            ${tier}
        </span>
        <button class="btn-delete" onclick="moveToRankings(this)">⬆️</button>
        <button class="btn-delete" onclick="deleteUnranked(this)">✕</button>
    `;
    
    unrankedList.appendChild(item);
}

function moveToRankings(button) {
    const item = button.closest('.unranked-item');
    const name = item.querySelector('.unranked-name').textContent;
    const tier = item.querySelector('.tier-badge').textContent.trim();
    
    item.remove();
    
    const tbody = document.getElementById('rankingsBody');
    if (tbody.children.length < MAX_RANKINGS) {
        addToRankings(name, tier);
        saveToLocalStorage();
    }
}

function deleteRankingRow(button) {
    button.closest('tr').remove();
    updateRankNumbers();
    saveToLocalStorage();
}

function deleteUnranked(button) {
    button.closest('.unranked-item').remove();
    saveToLocalStorage();
}

function updateRankNumbers() {
    const rows = document.querySelectorAll('#rankingsBody tr');
    rows.forEach((row, index) => {
        row.querySelector('.rank-col').textContent = `🏆 ${index + 1}`;
    });
}

function clearAll() {
    if (confirm('Möchtest du wirklich alles löschen?')) {
        document.getElementById('rankingsBody').innerHTML = '';
        document.getElementById('unrankedList').innerHTML = '';
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    const data = {
        rankings: [],
        unranked: []
    };

    // Rankings speichern
    document.querySelectorAll('#rankingsBody tr').forEach((row, index) => {
        const name = row.querySelector('.name-col').textContent;
        const tier = row.querySelector('.tier-badge').textContent.trim();
        data.rankings.push({ rank: index + 1, name, tier });
    });

    // Unranked speichern
    document.querySelectorAll('.unranked-item').forEach(item => {
        const name = item.querySelector('.unranked-name').textContent;
        const tier = item.querySelector('.tier-badge').textContent.trim();
        data.unranked.push({ name, tier });
    });

    localStorage.setItem('rankings-data', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('rankings-data');
    if (!saved) return;

    const data = JSON.parse(saved);

    // Rankings laden
    data.rankings.forEach(item => {
        addToRankings(item.name, item.tier);
    });

    // Unranked laden
    data.unranked.forEach(item => {
        addToUnranked(item.name, item.tier);
    });
}

// Enter-Taste zum Hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });

    loadFromLocalStorage();
});