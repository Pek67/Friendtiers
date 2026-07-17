let draggedElement = null;

// Drag and Drop Funktionen
function allowDrop(e) {
    e.preventDefault();
    e.target.closest('.tier-items, .unranked-items').classList.add('drag-over');
}

function drag(e) {
    draggedElement = e.target;
    e.dataTransfer.effectAllowed = 'move';
}

function drop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const tierContainer = e.target.closest('.tier-items, .unranked-items');
    if (tierContainer && draggedElement) {
        tierContainer.appendChild(draggedElement);
        saveToLocalStorage();
    }
    
    document.querySelectorAll('.tier-items, .unranked-items').forEach(el => {
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
    
    const item = createItemElement(name);
    document.getElementById('unranked').appendChild(item);
    
    input.value = '';
    input.focus();
    
    saveToLocalStorage();
}

function createItemElement(name) {
    const item = document.createElement('div');
    item.className = 'item';
    item.draggable = true;
    item.innerHTML = `
        <span>${name}</span>
        <button class="item-delete" onclick="deleteItem(this)">✕</button>
    `;
    
    item.addEventListener('dragstart', drag);
    item.addEventListener('dragend', () => {
        document.querySelectorAll('.tier-items, .unranked-items').forEach(el => {
            el.classList.remove('drag-over');
        });
    });
    
    return item;
}

// Item löschen
function deleteItem(button) {
    button.closest('.item').remove();
    saveToLocalStorage();
}

// Alles löschen
function clearAll() {
    if (confirm('Möchtest du wirklich alles löschen?')) {
        document.querySelectorAll('.tier-items, .unranked-items').forEach(el => {
            el.innerHTML = '';
        });
        saveToLocalStorage();
    }
}

// LocalStorage (automatisches Speichern)
function saveToLocalStorage() {
    const data = {
        tiers: {
            's': [],
            'a': [],
            'b': [],
            'c': [],
            'd': [],
            'f': [],
            'unranked': []
        }
    };
    
    // S-Tier
    document.querySelectorAll('#tier-s .item span').forEach(span => {
        data.tiers.s.push(span.textContent);
    });
    
    // A-Tier
    document.querySelectorAll('#tier-a .item span').forEach(span => {
        data.tiers.a.push(span.textContent);
    });
    
    // B-Tier
    document.querySelectorAll('#tier-b .item span').forEach(span => {
        data.tiers.b.push(span.textContent);
    });
    
    // C-Tier
    document.querySelectorAll('#tier-c .item span').forEach(span => {
        data.tiers.c.push(span.textContent);
    });
    
    // D-Tier
    document.querySelectorAll('#tier-d .item span').forEach(span => {
        data.tiers.d.push(span.textContent);
    });
    
    // F-Tier
    document.querySelectorAll('#tier-f .item span').forEach(span => {
        data.tiers.f.push(span.textContent);
    });
    
    // Unranked
    document.querySelectorAll('#unranked .item span').forEach(span => {
        data.tiers.unranked.push(span.textContent);
    });
    
    localStorage.setItem('friendtiers-data', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('friendtiers-data');
    if (!saved) return;
    
    const data = JSON.parse(saved);
    
    // S-Tier laden
    data.tiers.s.forEach(name => {
        document.getElementById('tier-s').appendChild(createItemElement(name));
    });
    
    // A-Tier laden
    data.tiers.a.forEach(name => {
        document.getElementById('tier-a').appendChild(createItemElement(name));
    });
    
    // B-Tier laden
    data.tiers.b.forEach(name => {
        document.getElementById('tier-b').appendChild(createItemElement(name));
    });
    
    // C-Tier laden
    data.tiers.c.forEach(name => {
        document.getElementById('tier-c').appendChild(createItemElement(name));
    });
    
    // D-Tier laden
    data.tiers.d.forEach(name => {
        document.getElementById('tier-d').appendChild(createItemElement(name));
    });
    
    // F-Tier laden
    data.tiers.f.forEach(name => {
        document.getElementById('tier-f').appendChild(createItemElement(name));
    });
    
    // Unranked laden
    data.tiers.unranked.forEach(name => {
        document.getElementById('unranked').appendChild(createItemElement(name));
    });
}

// Enter-Taste zum Hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addItem();
        }
    });
    
    loadFromLocalStorage();
});