const TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
const MAX_RANKINGS = 20;
let draggedElement = null;

// Drag and Drop Funktionen
function allowDrop(e) {
    e.preventDefault();
    e.target.closest('.ranking-list, .unranked-items')?.classList.add('drag-over');
}

function drag(e) {
    draggedElement = e.target.closest('.item, .unranked-item');
    e.dataTransfer.effectAllowed = 'move';
}

function drop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const container = e.target.closest('.ranking-list, .unranked-items');
    if (container && draggedElement) {
        const parent = draggedElement.closest('.ranking-item');
        if (parent) {
            container.appendChild(parent);
        } else {
            container.appendChild(draggedElement);
        }
        updateRankings();
        saveToLocalStorage();
    }
    
    document.querySelectorAll('.ranking-list, .unranked-items').forEach(el => {
        el.classList.remove('drag-over');
    });
}

// Item hinzufügen
function addItem() {
    const input = document.getElementById('nameInput');
    const name = input.value.trim();
    
    if (name === '') {
        alert('Bitte einen Namen eingeben!');
        return;
    }
    
    const item = createUnrankedItem(name);
    document.getElementById('unranked').appendChild(item);
    
    input.value = '';
    input.focus();
    
    saveToLocalStorage();
}

function createUnrankedItem(name) {
    const item = document.createElement('div');
    item.className = 'unranked-item';
    item.draggable = true;
    item.innerHTML = `
        <span>${name}</span>
        <button class="item-delete" onclick="deleteItem(this)">✕</button>
    `;
    
    item.addEventListener('dragstart', drag);
    item.addEventListener('dragend', () => {
        document.querySelectorAll('.ranking-list, .unranked-items').forEach(el => {
            el.classList.remove('drag-over');
        });
    });
    
    return item;
}

function createRankingItem(rank, name, tier = 'HT1') {
    const item = document.createElement('div');
    item.className = 'ranking-item';
    item.draggable = true;
    item.innerHTML = `
        <div class="rank-number ${rank <= 3 ? 'top3' : ''}">🏆 ${rank}</div>
        <div class="item">
            <span class="item-name">${name}</span>
            <select class="tier-select" onchange="saveToLocalStorage()">
                ${TIERS.map(t => `<option value="${t}" ${t === tier ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <button class="item-delete" onclick="deleteRanking(this)">✕</button>
        </div>
    `;
    
    item.addEventListener('dragstart', drag);
    item.addEventListener('dragend', () => {
        document.querySelectorAll('.ranking-list, .unranked-items').forEach(el => {
            el.classList.remove('drag-over');
        });
    });
    
    return item;
}

// Item löschen
function deleteItem(button) {
    button.closest('.unranked-item').remove();
    saveToLocalStorage();
}

function deleteRanking(button) {
    button.closest('.ranking-item').remove();
    updateRankings();
    saveToLocalStorage();
}

function updateRankings() {
    const rankingList = document.getElementById('rankingList');
    const items = rankingList.querySelectorAll('.ranking-item');
    
    items.forEach((item, index) => {
        const rankNumber = item.querySelector('.rank-number');
        const newRank = index + 1;
        rankNumber.textContent = `🏆 ${newRank}`;
        rankNumber.className = `rank-number ${newRank <= 3 ? 'top3' : ''}`;
    });
}

// Alles löschen
function clearAll() {
    if (confirm('Möchtest du wirklich alles löschen?')) {
        document.getElementById('rankingList').innerHTML = '';
        document.getElementById('unranked').innerHTML = '';
        saveToLocalStorage();
    }
}

// LocalStorage (automatisches Speichern)
function saveToLocalStorage() {
    const data = {
        rankings: [],
        unranked: []
    };
    
    // Rankings speichern
    document.querySelectorAll('#rankingList .ranking-item').forEach((item, index) => {
        const name = item.querySelector('.item-name').textContent;
        const tier = item.querySelector('.tier-select').value;
        data.rankings.push({ rank: index + 1, name, tier });
    });
    
    // Unranked speichern
    document.querySelectorAll('#unranked .unranked-item').forEach(item => {
        const name = item.querySelector('span').textContent;
        data.unranked.push(name);
    });
    
    localStorage.setItem('mctiers-data', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('mctiers-data');
    if (!saved) return;
    
    const data = JSON.parse(saved);
    
    // Rankings laden
    data.rankings.forEach(item => {
        const rankingItem = createRankingItem(item.rank, item.name, item.tier);
        document.getElementById('rankingList').appendChild(rankingItem);
    });
    
    // Unranked laden
    data.unranked.forEach(name => {
        const unrankedItem = createUnrankedItem(name);
        document.getElementById('unranked').appendChild(unrankedItem);
    });
}

// Enter-Taste zum Hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addItem();
        }
    });
    
    // Ranking Platzhalter (1-20)
    for (let i = 1; i <= MAX_RANKINGS; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'ranking-item';
        placeholder.innerHTML = `
            <div class="rank-number ${i <= 3 ? 'top3' : ''}">🏆 ${i}</div>
            <div style="flex: 1; background: #0f1426; border: 2px dashed #2a3050; border-radius: 6px; padding: 12px; color: #666; display: flex; align-items: center;">
                Platz ${i}
            </div>
        `;
        placeholder.id = `placeholder-${i}`;
        placeholder.style.opacity = '0.5';
        document.getElementById('rankingList').appendChild(placeholder);
    }
    
    loadFromLocalStorage();
});

// Rankings aktualisieren beim Laden
window.addEventListener('load', () => {
    // Placeholder nach dem Laden entfernen
    for (let i = 1; i <= MAX_RANKINGS; i++) {
        const placeholder = document.getElementById(`placeholder-${i}`);
        if (placeholder && placeholder.querySelector('.item-name') === null) {
            // Nur entfernen wenn es wirklich noch ein Placeholder ist
            const parent = placeholder.parentElement;
            if (parent && parent.querySelectorAll('.item-name').length > 0) {
                placeholder.remove();
            }
        }
    }
});