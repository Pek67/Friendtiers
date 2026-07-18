const TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];
const MAX_RANKINGS = 50;
const LOCAL_STORAGE_KEY = 'rankings-data';
const ACTIVE_GAMEMODE_STORAGE_KEY = 'friendtiers-active-gamemode';
const COMMENTS_LOCAL_KEY = 'friendtiers-comments-data';
const ADMIN_SESSION_KEY = 'friendtiers-admin-unlocked';
const VIEWER_KEY_STORAGE = 'friendtiers-viewer-key';
const SUPABASE_TABLE = 'friendtiers_state';
const COMMENTS_TABLE = 'friendtiers_comments';
const VOTES_TABLE = 'friendtiers_votes';
const REACTIONS_TABLE = 'friendtiers_comment_reactions';
const DAILY_ANSWERS_TABLE = 'friendtiers_daily_answers';
const VISITORS_TABLE = 'friendtiers_visitors';
const SUPABASE_ROW_ID = 'global';
const GAMEMODES = [
    { id: 'sword', label: 'Sword' },
    { id: 'crystal', label: 'Crystal' },
    { id: 'uhc', label: 'UHC' },
    { id: 'nethpot', label: 'NethPot' },
    { id: 'smp', label: 'SMP' },
    { id: 'axe', label: 'Axe' },
    { id: 'mace', label: 'Mace' },
    { id: 'bedwars', label: 'Bedwars' },
    { id: 'skywars', label: 'Skywars' },
    { id: 'builduhc', label: 'BuildUHC' },
    { id: 'nodebuff', label: 'Nodebuff' },
    { id: 'gapple', label: 'Gapple' },
    { id: 'sumo', label: 'Sumo' },
    { id: 'debuff', label: 'Debuff' }
];
const DEFAULT_GAMEMODE_ID = GAMEMODES[0].id;
const REACTION_EMOJIS = ['🔥', '👑', '😂'];
const DAILY_QUESTION = {
    key: 'tierlist-chaos-level',
    text: 'Wie fuehlt sich die aktuelle Tierlist an?',
    choices: ['Perfekt akkurat', 'Bisschen wild', 'Reines Chaos']
};
const MP3_TRACKS = [
    {
        title: 'Track 01',
        artist: 'FriendTiers Upload',
        sourceLabel: 'assets/music/track-01.mp3',
        filePath: 'assets/music/track-01.mp3'
    },
    {
        title: 'Track 02',
        artist: 'FriendTiers Upload',
        sourceLabel: 'assets/music/track-02.mp3',
        filePath: 'assets/music/track-02.mp3'
    },
    {
        title: 'Track 03',
        artist: 'FriendTiers Upload',
        sourceLabel: 'assets/music/track-03.mp3',
        filePath: 'assets/music/track-03.mp3'
    },
    {
        title: 'Track 04',
        artist: 'FriendTiers Upload',
        sourceLabel: 'assets/music/track-04.mp3',
        filePath: 'assets/music/track-04.mp3'
    },
    {
        title: 'Track 05',
        artist: 'FriendTiers Upload',
        sourceLabel: 'assets/music/track-05.mp3',
        filePath: 'assets/music/track-05.mp3'
    }
];

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
let visitorCount = 0;
let currentTrackIndex = 0;
let musicAudio = null;
let currentMusicVolume = 40;
let isMusicPlaying = false;
let selectedGamemodeId = DEFAULT_GAMEMODE_ID;
let gamemodeBoards = createEmptyGamemodeBoards();

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

function getMusicPlayButtonElement() {
    return document.getElementById('musicPlayButton');
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

function createEmptyBoard() {
    return {
        rankings: [],
        unranked: []
    };
}

function createEmptyGamemodeBoards() {
    const boards = {};
    GAMEMODES.forEach((mode) => {
        boards[mode.id] = createEmptyBoard();
    });
    return boards;
}

function getGamemodeById(modeId) {
    return GAMEMODES.find((mode) => mode.id === modeId) || GAMEMODES[0];
}

function normalizeGamemodeId(modeId) {
    return getGamemodeById(modeId).id;
}

function normalizePlayerEntry(entry, includeRank = false) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) {
        return null;
    }

    const normalized = {
        name,
        tier: normalizeTier(entry.tier)
    };

    if (includeRank) {
        normalized.rank = Number.isInteger(entry.rank) && entry.rank > 0 ? entry.rank : null;
    }

    return normalized;
}

function normalizeBoard(boardData) {
    const normalized = createEmptyBoard();

    const rankings = Array.isArray(boardData && boardData.rankings) ? boardData.rankings : [];
    rankings.forEach((item, index) => {
        const normalizedItem = normalizePlayerEntry(item, true);
        if (!normalizedItem) {
            return;
        }

        normalized.rankings.push({
            rank: index + 1,
            name: normalizedItem.name,
            tier: normalizedItem.tier
        });
    });

    const unranked = Array.isArray(boardData && boardData.unranked) ? boardData.unranked : [];
    unranked.forEach((item) => {
        const normalizedItem = normalizePlayerEntry(item);
        if (normalizedItem) {
            normalized.unranked.push(normalizedItem);
        }
    });

    return normalized;
}

function normalizeGamemodeBoards(rawData) {
    const normalizedBoards = createEmptyGamemodeBoards();

    if (
        rawData &&
        typeof rawData === 'object' &&
        rawData.gamemodes &&
        typeof rawData.gamemodes === 'object'
    ) {
        GAMEMODES.forEach((mode) => {
            normalizedBoards[mode.id] = normalizeBoard(rawData.gamemodes[mode.id]);
        });

        return normalizedBoards;
    }

    normalizedBoards[DEFAULT_GAMEMODE_ID] = normalizeBoard(rawData);
    return normalizedBoards;
}

function getCurrentBoard() {
    const modeId = normalizeGamemodeId(selectedGamemodeId);
    if (!gamemodeBoards[modeId]) {
        gamemodeBoards[modeId] = createEmptyBoard();
    }

    return gamemodeBoards[modeId];
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

function setVisitorStatus(message, state) {
    const statusElement = document.getElementById('visitorStatus');
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function setMusicStatus(message, state) {
    const statusElement = document.getElementById('musicStatus');
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.dataset.state = state;
}

function setVisitorCount(count) {
    visitorCount = count;
    const element = document.getElementById('visitorCountValue');
    if (element) {
        element.textContent = String(count);
    }
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

function createActionButton(label, handlerName, extraArgument) {
    const button = document.createElement('button');
    button.className = 'btn-delete';
    button.type = 'button';
    button.textContent = label;

    if (typeof extraArgument === 'number') {
        button.setAttribute('onclick', `${handlerName}(this, ${extraArgument})`);
    } else {
        button.setAttribute('onclick', `${handlerName}(this)`);
    }

    return button;
}

function clearRenderedData() {
    document.getElementById('rankingsBody').innerHTML = '';
    document.getElementById('unrankedList').innerHTML = '';
}

function collectCurrentData() {
    const serializedModes = {};
    GAMEMODES.forEach((mode) => {
        const board = gamemodeBoards[mode.id] || createEmptyBoard();
        serializedModes[mode.id] = {
            rankings: board.rankings.map((item, index) => ({
                rank: index + 1,
                name: item.name,
                tier: normalizeTier(item.tier)
            })),
            unranked: board.unranked.map((item) => ({
                name: item.name,
                tier: normalizeTier(item.tier)
            }))
        };
    });

    return {
        gamemodes: serializedModes
    };
}

function getBoardPlayers() {
    const data = getCurrentBoard();
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

function renderCurrentBoard() {
    clearRenderedData();
    const board = getCurrentBoard();

    board.rankings.forEach((item, index) => {
        addRankingRowToDom(item.name, item.tier, index);
    });

    board.unranked.forEach((item, index) => {
        addUnrankedItemToDom(item.name, item.tier, index);
    });

    updateRankNumbers();
    renderVoteOptions();
}

function updateGamemodeLabels() {
    const activeMode = getGamemodeById(selectedGamemodeId);
    const headingLabel = document.getElementById('rankingsGamemodeLabel');
    const hintLabel = document.getElementById('activeGamemodeHint');

    if (headingLabel) {
        headingLabel.textContent = activeMode.label;
    }

    if (hintLabel) {
        hintLabel.textContent = `Aktiv: ${activeMode.label}`;
    }
}

function setActiveGamemode(modeId) {
    selectedGamemodeId = normalizeGamemodeId(modeId);
    localStorage.setItem(ACTIVE_GAMEMODE_STORAGE_KEY, selectedGamemodeId);

    const selector = document.getElementById('gamemodeSelect');
    if (selector && selector.value !== selectedGamemodeId) {
        selector.value = selectedGamemodeId;
    }

    updateGamemodeLabels();
    renderCurrentBoard();
}

function initializeGamemodeSelector() {
    const selector = document.getElementById('gamemodeSelect');
    if (!selector) {
        return;
    }

    selector.innerHTML = '';
    GAMEMODES.forEach((mode) => {
        const option = document.createElement('option');
        option.value = mode.id;
        option.textContent = mode.label;
        selector.appendChild(option);
    });

    const savedMode = localStorage.getItem(ACTIVE_GAMEMODE_STORAGE_KEY);
    selectedGamemodeId = normalizeGamemodeId(savedMode || DEFAULT_GAMEMODE_ID);
    selector.value = selectedGamemodeId;
    selector.addEventListener('change', () => {
        setActiveGamemode(selector.value);
    });

    updateGamemodeLabels();
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
    const defaultBoard = data.gamemodes[DEFAULT_GAMEMODE_ID] || createEmptyBoard();
    const payload = {
        id: SUPABASE_ROW_ID,
        rankings: defaultBoard.rankings,
        unranked: defaultBoard.unranked,
        gamemodes: data.gamemodes,
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
        .select('rankings, unranked, gamemodes')
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

async function registerVisitorAndLoadCount() {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const { error: upsertError } = await client
        .from(VISITORS_TABLE)
        .upsert(
            {
                visitor_key: viewerKey,
                last_seen: now
            },
            { onConflict: 'visitor_key' }
        );

    if (upsertError) {
        throw upsertError;
    }

    const { count, error: countError } = await client
        .from(VISITORS_TABLE)
        .select('visitor_key', { count: 'exact', head: true });

    if (countError) {
        throw countError;
    }

    return count || 0;
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

function renderMusicTrackInfo() {
    const currentTrack = MP3_TRACKS[currentTrackIndex];
    const titleElement = document.getElementById('musicTrackTitle');
    const metaElement = document.getElementById('musicTrackMeta');
    const creditElement = document.getElementById('musicCredit');

    if (titleElement) {
        titleElement.textContent = `${currentTrack.title} — ${currentTrack.artist}`;
    }

    if (metaElement) {
        metaElement.textContent = currentTrack.sourceLabel;
    }

    if (creditElement) {
        creditElement.textContent = `Quelle: ${currentTrack.filePath}`;
    }
}

function updateMusicPlayButton() {
    const playButton = getMusicPlayButtonElement();
    if (!playButton) {
        return;
    }

    playButton.textContent = isMusicPlaying ? '⏸ Pause' : '▶ Play';
}

function applyMusicVolume() {
    if (musicAudio) {
        musicAudio.volume = Math.max(0, Math.min(1, currentMusicVolume / 100));
    }
}

function ensureMusicAudioElement() {
    if (musicAudio) {
        return musicAudio;
    }

    const audioElement = document.getElementById('musicAudio');
    if (!audioElement) {
        throw new Error('Audio-Element fehlt.');
    }

    musicAudio = audioElement;
    musicAudio.addEventListener('ended', () => {
        changeMusicTrack(1).catch((error) => {
            console.error('Fehler beim automatischen Track-Wechsel:', error);
            setMusicStatus('Naechster Track konnte nicht gestartet werden.', 'error');
        });
    });
    applyMusicVolume();
    return musicAudio;
}

function loadMusicTrack(index, keepPlaying = false) {
    currentTrackIndex = (index + MP3_TRACKS.length) % MP3_TRACKS.length;
    const track = MP3_TRACKS[currentTrackIndex];
    const audio = ensureMusicAudioElement();

    audio.src = track.filePath;
    renderMusicTrackInfo();
    applyMusicVolume();

    if (keepPlaying) {
        return audio.play().then(() => {
            isMusicPlaying = true;
            updateMusicPlayButton();
            setMusicStatus(`Laeuft: ${track.title}`, 'success');
        });
    }

    audio.pause();
    audio.currentTime = 0;
    isMusicPlaying = false;
    updateMusicPlayButton();
    setMusicStatus(`Track bereit: ${track.title}`, 'info');
    return Promise.resolve();
}

async function toggleMusicPlayback() {
    try {
        const audio = ensureMusicAudioElement();
        if (!audio.src) {
            await loadMusicTrack(currentTrackIndex);
        }

        if (!isMusicPlaying) {
            await audio.play();
            isMusicPlaying = true;
            updateMusicPlayButton();
            setMusicStatus(`Laeuft: ${MP3_TRACKS[currentTrackIndex].title}`, 'success');
        } else {
            audio.pause();
            isMusicPlaying = false;
            updateMusicPlayButton();
            setMusicStatus('Pausiert.', 'info');
        }
    } catch (error) {
        console.error('Fehler beim Starten der Musik:', error);
        setMusicStatus('Musik konnte nicht gestartet werden.', 'error');
    }
}

async function changeMusicTrack(direction) {
    const shouldResume = isMusicPlaying;
    await loadMusicTrack(currentTrackIndex + direction, shouldResume);
}

function initializeMusicPlayer() {
    ensureMusicAudioElement();
    loadMusicTrack(0).catch((error) => {
        console.error('Fehler beim Vorbereiten des Musikplayers:', error);
        setMusicStatus('Musik konnte nicht vorbereitet werden.', 'error');
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

    const board = getCurrentBoard();
    if (board.rankings.length < MAX_RANKINGS) {
        addToRankings(name, tier);
    } else {
        addToUnranked(name, tier);
    }

    nameInput.value = '';
    nameInput.focus();
    renderVoteOptions();
    saveState();
}

function addRankingRowToDom(name, tier, index) {
    const tbody = document.getElementById('rankingsBody');
    const rank = index + 1;

    const row = document.createElement('tr');
    row.className = 'ranking-row';
    row.dataset.index = String(index);

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

    const rankingActions = document.createElement('div');
    rankingActions.className = 'ranking-actions';
    rankingActions.appendChild(createActionButton('⬆️', 'moveRankingPosition', -1));
    rankingActions.appendChild(createActionButton('⬇️', 'moveRankingPosition', 1));
    rankingActions.appendChild(createActionButton('✕', 'deleteRankingRow'));

    actionsCell.appendChild(rankingActions);

    row.appendChild(rankCell);
    row.appendChild(nameCell);
    row.appendChild(tierCell);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
}

function addUnrankedItemToDom(name, tier, index) {
    const unrankedList = document.getElementById('unrankedList');

    const item = document.createElement('div');
    item.className = 'unranked-item';
    item.dataset.index = String(index);

    const nameElement = document.createElement('span');
    nameElement.className = 'unranked-name';
    nameElement.textContent = name;

    const actionsElement = document.createElement('div');
    actionsElement.className = 'unranked-actions admin-actions';
    actionsElement.appendChild(createActionButton('⬆️', 'moveToRankings'));
    actionsElement.appendChild(createActionButton('✕', 'deleteUnranked'));

    item.appendChild(nameElement);
    item.appendChild(createTierBadge(tier));
    item.appendChild(actionsElement);

    unrankedList.appendChild(item);
}

function addToRankings(name, tier) {
    const board = getCurrentBoard();
    board.rankings.push({
        rank: board.rankings.length + 1,
        name,
        tier: normalizeTier(tier)
    });
    renderCurrentBoard();
}

function addToUnranked(name, tier) {
    const board = getCurrentBoard();
    board.unranked.push({
        name,
        tier: normalizeTier(tier)
    });
    renderCurrentBoard();
}

function moveRankingPosition(button, direction) {
    if (!requireAdminAction()) {
        return;
    }

    const row = button.closest('tr');
    const fromIndex = Number.parseInt(row && row.dataset.index ? row.dataset.index : '-1', 10);
    const board = getCurrentBoard();
    const toIndex = fromIndex + direction;

    if (fromIndex < 0 || toIndex < 0 || toIndex >= board.rankings.length) {
        return;
    }

    const [movingRow] = board.rankings.splice(fromIndex, 1);
    board.rankings.splice(toIndex, 0, movingRow);
    renderCurrentBoard();
    renderVoteOptions();
    saveState();
}

function moveToRankings(button) {
    if (!requireAdminAction()) {
        return;
    }

    const board = getCurrentBoard();
    if (board.rankings.length >= MAX_RANKINGS) {
        alert(`Die Rankings sind voll. Maximal ${MAX_RANKINGS} Eintraege moeglich.`);
        return;
    }

    const item = button.closest('.unranked-item');
    const unrankedIndex = Number.parseInt(item && item.dataset.index ? item.dataset.index : '-1', 10);
    if (unrankedIndex < 0 || unrankedIndex >= board.unranked.length) {
        return;
    }

    const [movedItem] = board.unranked.splice(unrankedIndex, 1);
    board.rankings.push({
        rank: board.rankings.length + 1,
        name: movedItem.name,
        tier: normalizeTier(movedItem.tier)
    });
    renderCurrentBoard();
    renderVoteOptions();
    saveState();
}

function deleteRankingRow(button) {
    if (!requireAdminAction()) {
        return;
    }

    const row = button.closest('tr');
    const rankingIndex = Number.parseInt(row && row.dataset.index ? row.dataset.index : '-1', 10);
    const board = getCurrentBoard();

    if (rankingIndex < 0 || rankingIndex >= board.rankings.length) {
        return;
    }

    board.rankings.splice(rankingIndex, 1);
    renderCurrentBoard();
    renderVoteOptions();
    saveState();
}

function deleteUnranked(button) {
    if (!requireAdminAction()) {
        return;
    }

    const item = button.closest('.unranked-item');
    const unrankedIndex = Number.parseInt(item && item.dataset.index ? item.dataset.index : '-1', 10);
    const board = getCurrentBoard();

    if (unrankedIndex < 0 || unrankedIndex >= board.unranked.length) {
        return;
    }

    board.unranked.splice(unrankedIndex, 1);
    renderCurrentBoard();
    renderVoteOptions();
    saveState();
}

function updateRankNumbers() {
    const rows = document.querySelectorAll('#rankingsBody tr');
    rows.forEach((row, index) => {
        row.dataset.index = String(index);
        row.querySelector('.rank-col').textContent = `🏆 ${index + 1}`;
    });

    const board = getCurrentBoard();
    board.rankings.forEach((item, index) => {
        item.rank = index + 1;
    });

    const unrankedItems = document.querySelectorAll('#unrankedList .unranked-item');
    unrankedItems.forEach((item, index) => {
        item.dataset.index = String(index);
    });
}

function clearAll() {
    if (!requireAdminAction()) {
        return;
    }

    if (!confirm('Moechtest du wirklich alles loeschen?')) {
        return;
    }

    const board = getCurrentBoard();
    board.rankings = [];
    board.unranked = [];
    renderCurrentBoard();
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
    gamemodeBoards = normalizeGamemodeBoards(data);
    setActiveGamemode(selectedGamemodeId);
}

async function loadSavedData() {
    const localData = loadLocalData();

    if (!isSupabaseConfigured()) {
        if (localData) {
            renderLoadedData(localData);
            saveToLocalCache(collectCurrentData());
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
            saveToLocalCache(collectCurrentData());
            renderVoteOptions();
            setSyncStatus('Gemeinsame Liste geladen.', 'success');
            return;
        }

        if (localData) {
            renderLoadedData(localData);
            saveToLocalCache(collectCurrentData());
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
            saveToLocalCache(collectCurrentData());
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

async function loadVisitorCounter() {
    if (!isSupabaseConfigured()) {
        setVisitorCount(1);
        setVisitorStatus('Ohne Supabase wird nur dein lokaler Besuch gezaehlt.', 'warning');
        return;
    }

    try {
        const count = await registerVisitorAndLoadCount();
        setVisitorCount(count);
        setVisitorStatus('Besucherzahl live geladen.', 'success');
    } catch (error) {
        console.error('Fehler beim Besucherzaehler:', error);
        setVisitorStatus('Besucherzahl konnte nicht geladen werden.', 'error');
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

function bindMusicControls() {
    const prevButton = document.getElementById('musicPrevButton');
    const playButton = document.getElementById('musicPlayButton');
    const nextButton = document.getElementById('musicNextButton');

    if (prevButton) {
        prevButton.addEventListener('click', async () => {
            await changeMusicTrack(-1);
        });
    }

    if (playButton) {
        playButton.addEventListener('click', async () => {
            await toggleMusicPlayback();
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', async () => {
            await changeMusicTrack(1);
        });
    }

    const volumeSlider = document.getElementById('musicVolumeSlider');
    const volumeLabel = document.getElementById('volumeLabel');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', () => {
            const val = parseInt(volumeSlider.value, 10);
            currentMusicVolume = val;
            if (volumeLabel) {
                volumeLabel.textContent = `${val}%`;
            }
            applyMusicVolume();
        });
        currentMusicVolume = parseInt(volumeSlider.value, 10);
    }

    if (volumeLabel) {
        volumeLabel.textContent = `${currentMusicVolume}%`;
    }

    initializeMusicPlayer();
}

async function initializeApp() {
    viewerKey = getViewerKey();

    const nameInput = document.getElementById('nameInput');
    if (nameInput) {
        nameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                addPlayer();
            }
        });
    }

    bindAdminActions();
    bindCommentActions();
    bindMusicControls();
    initializeGamemodeSelector();
    setActiveGamemode(selectedGamemodeId);
    restoreAdminSession();
    await loadSavedData();
    await Promise.all([loadComments(), loadViewerFeatures(), loadVisitorCounter()]);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch((error) => {
        console.error('Initialisierung fehlgeschlagen:', error);
        setAuthStatus('Initialisierung fehlgeschlagen.', 'error');
        setSyncStatus('Die Seite konnte nicht komplett geladen werden.', 'error');
    });
});
