const TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
const MAX_RANKINGS = 20;
const LOCAL_STORAGE_KEY = 'rankings-data';
const COMMENTS_LOCAL_KEY = 'friendtiers-comments-data';
const ADMIN_SESSION_KEY = 'friendtiers-admin-unlocked';
const VIEWER_KEY_STORAGE = 'friendtiers-viewer-key';
const SUPABASE_TABLE = 'friendtiers_state';
const COMMENTS_TABLE = 'friendtiers_comments';
const VOTES_TABLE = 'friendtiers_votes';
const REACTIONS_TABLE = 'friendtiers_comment_reactions';
const DAILY_ANSWERS_TABLE = 'friendtiers_daily_answers';
const SUPABASE_ROW_ID = 'global';
const REACTION_EMOJIS = ['🔥', '👑', '😂'];
const DAILY_QUESTION = {
    key: 'tierlist-chaos-level',
    text: 'Wie fuehlt sich die aktuelle Tierlist an?',
    choices: ['Perfekt akkurat', 'Bisschen wild', 'Reines Chaos']
};

const TIER_COLORS = {
    HT1: '#170f2c',
    LT1: '#291948',
    HT2: '#3a1f63',
    LT2: '#4d2a7f',
    HT3: '#5f3598',
    LT3: '#7449ad',
    HT4: '#8c63c4',
    LT4: '#a57ddb',
    HT5: '#c39cff',
    LT5: '#d8baff'
};

let supabaseClient = null;
let isAdmin = false;
let allComments = [];
let viewerKey = '';
let voteCounts = {};
let selectedVotePlayer = '';
let dailyCounts = {};
let selectedDailyChoice = '';
let commentReactionCounts = {};
let selectedCommentReactions = {};

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

function getViewerKey() {
    const existing = localStorage.getItem(VIEWER_KEY_STORAGE);
    if (existing) {
        return existing;
    }

    const generated = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VIEWER_KEY_STORAGE, generated);
    return generated;
}

function normalizeTier(tier) {
    return TIERS.includes(tier) ? tier : TIERS[0];
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

function setCommentStatus(side, message, state) {
    const statusElement = document.getElementById(`${side}CommentStatus`);
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function setVoteStatus(message, state) {
    const statusElement = document.getElementById('voteStatus');
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function setDailyStatus(message, state) {
    const statusElement = document.getElementById('dailyStatus');
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function getCommentFormParts(side) {
    return {
        form: document.getElementById(`${side}CommentForm`),
        nameInput: document.getElementById(`${side}CommentName`),
        messageInput: document.getElementById(`${side}CommentMessage`),
        list: document.getElementById(`${side}CommentsList`)
    };
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

function getBoardPlayers() {
    const data = collectCurrentData();
    const names = [];

    data.rankings.forEach((item) => {
        if (item.name) {
            names.push(item.name);
        }
    });

    data.unranked.forEach((item) => {
        if (item.name) {
            names.push(item.name);
        }
    });

    return names;
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

function loadLocalComments() {
    const saved = localStorage.getItem(COMMENTS_LOCAL_KEY);
    if (!saved) {
        return [];
    }

    return JSON.parse(saved);
}

function saveLocalComments(comments) {
    localStorage.setItem(COMMENTS_LOCAL_KEY, JSON.stringify(comments));
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

async function loadCommentsFromSupabase() {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from(COMMENTS_TABLE)
        .select('id, side, author, message, created_at')
        .order('created_at', { ascending: false })
        .limit(80);

    if (error) {
        throw error;
    }

    return Array.isArray(data) ? data : [];
}

async function insertCommentToSupabase(comment) {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from(COMMENTS_TABLE)
        .insert(comment)
        .select('id, side, author, message, created_at')
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function loadVotesFromSupabase() {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from(VOTES_TABLE)
        .select('player_name, voter_key');

    if (error) {
        throw error;
    }

    voteCounts = {};
    selectedVotePlayer = '';

    (data || []).forEach((row) => {
        voteCounts[row.player_name] = (voteCounts[row.player_name] || 0) + 1;
        if (row.voter_key === viewerKey) {
            selectedVotePlayer = row.player_name;
        }
    });
}

async function submitVote(playerName) {
    const client = getSupabaseClient();
    const payload = {
        voter_key: viewerKey,
        player_name: playerName,
        updated_at: new Date().toISOString()
    };

    const previousVote = selectedVotePlayer;
    const { error } = await client
        .from(VOTES_TABLE)
        .upsert(payload, { onConflict: 'voter_key' });

    if (error) {
        throw error;
    }

    if (previousVote && voteCounts[previousVote]) {
        voteCounts[previousVote] -= 1;
    }

    voteCounts[playerName] = (voteCounts[playerName] || 0) + 1;
    selectedVotePlayer = playerName;
}

async function loadDailyAnswersFromSupabase() {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from(DAILY_ANSWERS_TABLE)
        .select('choice, voter_key')
        .eq('question_key', DAILY_QUESTION.key);

    if (error) {
        throw error;
    }

    dailyCounts = {};
    selectedDailyChoice = '';

    DAILY_QUESTION.choices.forEach((choice) => {
        dailyCounts[choice] = 0;
    });

    (data || []).forEach((row) => {
        dailyCounts[row.choice] = (dailyCounts[row.choice] || 0) + 1;
        if (row.voter_key === viewerKey) {
            selectedDailyChoice = row.choice;
        }
    });
}

async function submitDailyAnswer(choice) {
    const client = getSupabaseClient();
    const payload = {
        question_key: DAILY_QUESTION.key,
        voter_key: viewerKey,
        choice,
        updated_at: new Date().toISOString()
    };

    const previousChoice = selectedDailyChoice;
    const { error } = await client
        .from(DAILY_ANSWERS_TABLE)
        .upsert(payload, { onConflict: 'question_key,voter_key' });

    if (error) {
        throw error;
    }

    if (previousChoice && dailyCounts[previousChoice]) {
        dailyCounts[previousChoice] -= 1;
    }

    dailyCounts[choice] = (dailyCounts[choice] || 0) + 1;
    selectedDailyChoice = choice;
}

async function loadCommentReactionsFromSupabase() {
    const client = getSupabaseClient();
    const { data, error } = await client
        .from(REACTIONS_TABLE)
        .select('comment_id, emoji, voter_key');

    if (error) {
        throw error;
    }

    commentReactionCounts = {};
    selectedCommentReactions = {};

    (data || []).forEach((row) => {
        if (!commentReactionCounts[row.comment_id]) {
            commentReactionCounts[row.comment_id] = {};
        }
        commentReactionCounts[row.comment_id][row.emoji] = (commentReactionCounts[row.comment_id][row.emoji] || 0) + 1;

        if (row.voter_key === viewerKey) {
            if (!selectedCommentReactions[row.comment_id]) {
                selectedCommentReactions[row.comment_id] = {};
            }
            selectedCommentReactions[row.comment_id][row.emoji] = true;
        }
    });
}

async function toggleCommentReaction(commentId, emoji) {
    const client = getSupabaseClient();
    const alreadySelected = Boolean(
        selectedCommentReactions[commentId] && selectedCommentReactions[commentId][emoji]
    );

    if (alreadySelected) {
        const { error } = await client
            .from(REACTIONS_TABLE)
            .delete()
            .eq('comment_id', commentId)
            .eq('emoji', emoji)
            .eq('voter_key', viewerKey);

        if (error) {
            throw error;
        }

        selectedCommentReactions[commentId][emoji] = false;
        if (commentReactionCounts[commentId] && commentReactionCounts[commentId][emoji]) {
            commentReactionCounts[commentId][emoji] -= 1;
        }
        return;
    }

    const payload = {
        comment_id: commentId,
        emoji,
        voter_key: viewerKey
    };

    const { error } = await client
        .from(REACTIONS_TABLE)
        .upsert(payload, { onConflict: 'comment_id,emoji,voter_key' });

    if (error) {
        throw error;
    }

    if (!selectedCommentReactions[commentId]) {
        selectedCommentReactions[commentId] = {};
    }
    selectedCommentReactions[commentId][emoji] = true;

    if (!commentReactionCounts[commentId]) {
        commentReactionCounts[commentId] = {};
    }
    commentReactionCounts[commentId][emoji] = (commentReactionCounts[commentId][emoji] || 0) + 1;
}

function formatCommentTime(timestamp) {
    if (!timestamp) {
        return 'jetzt';
    }

    return new Date(timestamp).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function createReactionButton(commentId, emoji) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reaction-btn';

    const count = commentReactionCounts[commentId] && commentReactionCounts[commentId][emoji]
        ? commentReactionCounts[commentId][emoji]
        : 0;

    if (selectedCommentReactions[commentId] && selectedCommentReactions[commentId][emoji]) {
        button.classList.add('is-selected');
    }

    button.textContent = `${emoji} ${count}`;
    button.addEventListener('click', async () => {
        if (!isSupabaseConfigured()) {
            setCommentStatus('left', 'Reactions brauchen Supabase.', 'warning');
            setCommentStatus('right', 'Reactions brauchen Supabase.', 'warning');
            return;
        }

        try {
            await toggleCommentReaction(commentId, emoji);
            renderComments();
        } catch (error) {
            console.error('Fehler bei der Reaction:', error);
            setCommentStatus('left', 'Reaction konnte nicht gespeichert werden.', 'error');
            setCommentStatus('right', 'Reaction konnte nicht gespeichert werden.', 'error');
        }
    });

    return button;
}

function createCommentElement(comment) {
    const wrapper = document.createElement('div');
    wrapper.className = 'comment-item';

    const head = document.createElement('div');
    head.className = 'comment-item-head';

    const author = document.createElement('span');
    author.className = 'comment-author';
    author.textContent = comment.author || 'Gast';

    const time = document.createElement('span');
    time.className = 'comment-time';
    time.textContent = formatCommentTime(comment.created_at);

    head.appendChild(author);
    head.appendChild(time);

    const message = document.createElement('div');
    message.className = 'comment-message';
    message.textContent = comment.message || '';

    wrapper.appendChild(head);
    wrapper.appendChild(message);

    if (comment.id) {
        const reactions = document.createElement('div');
        reactions.className = 'comment-reactions';
        REACTION_EMOJIS.forEach((emoji) => {
            reactions.appendChild(createReactionButton(comment.id, emoji));
        });
        wrapper.appendChild(reactions);
    }

    return wrapper;
}

function renderComments() {
    const left = getCommentFormParts('left');
    const right = getCommentFormParts('right');
    if (!left.list || !right.list) {
        return;
    }

    left.list.innerHTML = '';
    right.list.innerHTML = '';

    allComments.forEach((comment) => {
        const target = comment.side === 'right' ? right.list : left.list;
        target.appendChild(createCommentElement(comment));
    });
}

function renderVoteOptions() {
    const container = document.getElementById('voteOptions');
    if (!container) {
        return;
    }

    const players = getBoardPlayers();
    container.innerHTML = '';

    if (!players.length) {
        setVoteStatus('Noch keine Spieler zum Voten da.', 'warning');
        return;
    }

    setVoteStatus('Stimme fuer deinen Favoriten ab.', 'info');

    players.forEach((playerName) => {
        const row = document.createElement('div');
        row.className = 'vote-option';
        if (selectedVotePlayer === playerName) {
            row.classList.add('is-selected');
        }

        const meta = document.createElement('div');
        meta.className = 'vote-meta';

        const name = document.createElement('span');
        name.className = 'vote-name';
        name.textContent = playerName;

        const count = document.createElement('span');
        count.className = 'vote-count';
        count.textContent = `${voteCounts[playerName] || 0} Votes`;

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = selectedVotePlayer === playerName ? 'Gewaehlt' : 'Voten';
        button.addEventListener('click', async () => {
            if (!isSupabaseConfigured()) {
                setVoteStatus('Votes brauchen Supabase.', 'warning');
                return;
            }

            try {
                await submitVote(playerName);
                renderVoteOptions();
                setVoteStatus(`Vote fuer ${playerName} gespeichert.`, 'success');
            } catch (error) {
                console.error('Fehler beim Voting:', error);
                setVoteStatus('Vote konnte nicht gespeichert werden.', 'error');
            }
        });

        meta.appendChild(name);
        meta.appendChild(count);
        row.appendChild(meta);
        row.appendChild(button);
        container.appendChild(row);
    });
}

function renderDailyQuestion() {
    const questionElement = document.getElementById('dailyQuestionText');
    const container = document.getElementById('dailyQuestionOptions');
    if (!container) {
        return;
    }

    if (questionElement) {
        questionElement.textContent = DAILY_QUESTION.text;
    }

    container.innerHTML = '';
    setDailyStatus('Stimme bei der Daily-Frage ab.', 'info');

    DAILY_QUESTION.choices.forEach((choice) => {
        const row = document.createElement('div');
        row.className = 'daily-option';
        if (selectedDailyChoice === choice) {
            row.classList.add('is-selected');
        }

        const meta = document.createElement('div');
        meta.className = 'daily-meta';

        const name = document.createElement('span');
        name.className = 'daily-name';
        name.textContent = choice;

        const count = document.createElement('span');
        count.className = 'daily-count';
        count.textContent = `${dailyCounts[choice] || 0} Stimmen`;

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = selectedDailyChoice === choice ? 'Gewaehlt' : 'Antworten';
        button.addEventListener('click', async () => {
            if (!isSupabaseConfigured()) {
                setDailyStatus('Die Daily-Frage braucht Supabase.', 'warning');
                return;
            }

            try {
                await submitDailyAnswer(choice);
                renderDailyQuestion();
                setDailyStatus('Antwort gespeichert.', 'success');
            } catch (error) {
                console.error('Fehler bei der Daily-Frage:', error);
                setDailyStatus('Antwort konnte nicht gespeichert werden.', 'error');
            }
        });

        meta.appendChild(name);
        meta.appendChild(count);
        row.appendChild(meta);
        row.appendChild(button);
        container.appendChild(row);
    });
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
    renderVoteOptions();
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
    renderVoteOptions();
    saveState();
}

function deleteRankingRow(button) {
    if (!requireAdminAction()) {
        return;
    }

    button.closest('tr').remove();
    updateRankNumbers();
    renderVoteOptions();
    saveState();
}

function deleteUnranked(button) {
    if (!requireAdminAction()) {
        return;
    }

    button.closest('.unranked-item').remove();
    renderVoteOptions();
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
    renderVoteOptions();
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
        renderVoteOptions();
        setSyncStatus('Supabase ist nicht konfiguriert.', 'warning');
        return;
    }

    try {
        setSyncStatus('Lade gemeinsame Liste...', 'info');
        const remoteData = await loadFromSupabase();

        if (remoteData) {
            renderLoadedData(remoteData);
            saveToLocalCache(remoteData);
            renderVoteOptions();
            setSyncStatus('Gemeinsame Liste geladen.', 'success');
            return;
        }

        if (localData) {
            renderLoadedData(localData);
            renderVoteOptions();
            setSyncStatus('Lokale Daten geladen.', 'warning');
            return;
        }

        renderVoteOptions();
        setSyncStatus('Bereit - die gemeinsame Liste ist noch leer.', 'info');
    } catch (error) {
        console.error('Fehler beim Laden aus Supabase:', error);

        if (localData) {
            renderLoadedData(localData);
            renderVoteOptions();
            setSyncStatus('Supabase nicht erreichbar - lokale Daten geladen.', 'warning');
            return;
        }

        renderVoteOptions();
        setSyncStatus('Supabase konnte nicht geladen werden.', 'error');
    }
}

async function loadComments() {
    if (!isSupabaseConfigured()) {
        allComments = loadLocalComments();
        renderComments();
        setCommentStatus('left', 'Kommentare lokal geladen.', 'warning');
        setCommentStatus('right', 'Kommentare lokal geladen.', 'warning');
        return;
    }

    try {
        const [comments] = await Promise.all([
            loadCommentsFromSupabase(),
            loadCommentReactionsFromSupabase()
        ]);
        allComments = comments;
        saveLocalComments(allComments);
        renderComments();
        setCommentStatus('left', 'Live-Kommentare aktiv.', 'success');
        setCommentStatus('right', 'Live-Kommentare aktiv.', 'success');
    } catch (error) {
        console.error('Fehler beim Laden der Kommentare:', error);
        allComments = loadLocalComments();
        renderComments();
        setCommentStatus('left', 'Supabase nicht erreichbar, lokale Kommentare aktiv.', 'warning');
        setCommentStatus('right', 'Supabase nicht erreichbar, lokale Kommentare aktiv.', 'warning');
    }
}

async function loadViewerFeatures() {
    renderDailyQuestion();
    renderVoteOptions();

    if (!isSupabaseConfigured()) {
        setVoteStatus('Voting braucht Supabase.', 'warning');
        setDailyStatus('Daily-Frage braucht Supabase.', 'warning');
        return;
    }

    try {
        await Promise.all([loadVotesFromSupabase(), loadDailyAnswersFromSupabase()]);
        renderVoteOptions();
        renderDailyQuestion();
        setVoteStatus('Live-Voting aktiv.', 'success');
        setDailyStatus('Daily-Frage aktiv.', 'success');
    } catch (error) {
        console.error('Fehler beim Laden der Viewer-Features:', error);
        setVoteStatus('Voting konnte nicht geladen werden.', 'error');
        setDailyStatus('Daily-Frage konnte nicht geladen werden.', 'error');
    }
}

async function submitComment(side) {
    const { nameInput, messageInput } = getCommentFormParts(side);
    const author = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Gast';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!message) {
        setCommentStatus(side, 'Bitte eine Nachricht eingeben.', 'warning');
        return;
    }

    const payload = {
        side,
        author,
        message
    };

    if (!isSupabaseConfigured()) {
        const fallback = {
            id: Date.now(),
            side,
            author,
            message,
            created_at: new Date().toISOString()
        };
        allComments = [fallback, ...allComments].slice(0, 80);
        saveLocalComments(allComments);
        renderComments();
        setCommentStatus(side, 'Lokal gespeichert (ohne Supabase).', 'warning');
        messageInput.value = '';
        return;
    }

    try {
        const inserted = await insertCommentToSupabase(payload);
        allComments = [inserted, ...allComments].slice(0, 80);
        saveLocalComments(allComments);
        renderComments();
        setCommentStatus(side, 'Kommentar gesendet.', 'success');
        messageInput.value = '';
    } catch (error) {
        console.error('Fehler beim Speichern des Kommentars:', error);
        setCommentStatus(side, 'Kommentar konnte nicht gesendet werden.', 'error');
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

function bindCommentActions() {
    ['left', 'right'].forEach((side) => {
        const { form } = getCommentFormParts(side);
        if (!form) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await submitComment(side);
        });
    });
}

async function initializeApp() {
    viewerKey = getViewerKey();

    const nameInput = document.getElementById('nameInput');
    nameInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addPlayer();
        }
    });

    bindAdminActions();
    bindCommentActions();
    restoreAdminSession();
    await loadSavedData();
    await Promise.all([loadComments(), loadViewerFeatures()]);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch((error) => {
        console.error('Initialisierung fehlgeschlagen:', error);
        setAuthStatus('Initialisierung fehlgeschlagen.', 'error');
        setSyncStatus('Die Seite konnte nicht komplett geladen werden.', 'error');
    });
});
