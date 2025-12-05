// --- CONSTANTS & CONFIG ---
let currentUsdRate = 6.00; // Fallback

const GAMES = {
    mtg: {
        name: "Magic", icon: "fa-dragon", color: "text-red-500", btnColor: "bg-red-600",
        formats: [{ val: "standard", label: "Standard" }, { val: "pioneer", label: "Pioneer" }, { val: "modern", label: "Modern" }, { val: "pauper", label: "Pauper" }, { val: "commander", label: "Commander" }],
        resources: [
            { id: 'w', label: 'W', class: 'mana-w', icon: 'fa-sun', tooltip: 'Branco' },
            { id: 'u', label: 'U', class: 'mana-u', icon: 'fa-droplet', tooltip: 'Azul' },
            { id: 'b', label: 'B', class: 'mana-b', icon: 'fa-skull', tooltip: 'Preto' },
            { id: 'r', label: 'R', class: 'mana-r', icon: 'fa-fire', tooltip: 'Vermelho' },
            { id: 'g', label: 'G', class: 'mana-g', icon: 'fa-tree', tooltip: 'Verde' }
        ],
        stats: { l1: "Criaturas", l2: "Mágicas", l3: "Terrenos" },
        chartTitle: "Curva de Mana"
    },
    pokemon: {
        name: "Pokémon", icon: "fa-circle-dot", color: "text-yellow-400", btnColor: "bg-yellow-500",
        formats: [{ val: "standard", label: "Standard" }, { val: "expanded", label: "Expanded" }, { val: "unlimited", label: "Unlimited" }],
        resources: [
            { id: 'Grass', class: 'type-grass', icon: 'fa-leaf' }, { id: 'Fire', class: 'type-fire', icon: 'fa-fire' },
            { id: 'Water', class: 'type-water', icon: 'fa-tint' }, { id: 'Lightning', class: 'type-lightning', icon: 'fa-bolt' },
            { id: 'Psychic', class: 'type-psychic', icon: 'fa-eye' }, { id: 'Fighting', class: 'type-fighting', icon: 'fa-hand-back-fist' },
            { id: 'Darkness', class: 'type-darkness', icon: 'fa-moon' }, { id: 'Metal', class: 'type-metal', icon: 'fa-cog' }
        ],
        stats: { l1: "Pokémon", l2: "Treinadores", l3: "Energia" },
        chartTitle: "Composição"
    }
};

const MTG_LANDS = { 'w': 'Plains', 'u': 'Island', 'b': 'Swamp', 'r': 'Mountain', 'g': 'Forest' };
const PKMN_ENERGY_IMGS = { 'Grass': 'https://assets.tcgdex.net/en/sm/sm1/164/high.webp', 'Fire': 'https://assets.tcgdex.net/en/sm/sm1/165/high.webp', 'Water': 'https://assets.tcgdex.net/en/sm/sm1/166/high.webp', 'Lightning': 'https://assets.tcgdex.net/en/sm/sm1/167/high.webp', 'Psychic': 'https://assets.tcgdex.net/en/sm/sm1/168/high.webp', 'Fighting': 'https://assets.tcgdex.net/en/sm/sm1/169/high.webp', 'Darkness': 'https://assets.tcgdex.net/en/sm/sm1/170/high.webp', 'Metal': 'https://assets.tcgdex.net/en/sm/sm1/171/high.webp' };
const PKMN_STAPLES = ["Professor's Research", "Boss's Orders", "Ultra Ball", "Nest Ball", "Rare Candy", "Switch", "Iono", "Arven"];

// --- STATE ---
let currentGameMode = 'mtg';
let selectedResources = [];
let currentDeck = [];
let sidebarOpen = true;

// --- INIT ---
window.onload = async () => {
    if (window.innerWidth < 768) {
        sidebarOpen = false;
        document.getElementById('sidebar').classList.add('closed');
        document.getElementById('main-content').classList.remove('expanded');
    }
    updateUIForGameMode();
    await fetchCurrencyRate();

    // Auto-load last session if exists
    const saved = localStorage.getItem('lastDeck');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            currentDeck = parsed.deck;
            currentGameMode = parsed.mode;
            selectedResources = parsed.colors;
            updateUIForGameMode();

            // Restore UI State
            document.getElementById('game-switch').classList.toggle('pkmn-mode', currentGameMode === 'pokemon');
            selectedResources.forEach(id => {
                const btn = document.getElementById(`btn-${id}`);
                if (btn) btn.classList.add('selected');
            });

            renderDeck();
        } catch (e) { console.log("No valid save found"); }
    }
};

// --- HELPERS ---
async function fetchCurrencyRate() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data.rates && data.rates.BRL) {
            currentUsdRate = data.rates.BRL;
            document.getElementById('usd-rate').innerText = `USD: R$ ${currentUsdRate.toFixed(2)}`;
        }
    } catch (e) { console.warn("Currency fetch failed, using fallback"); }
}

function updateBudgetLabel(val) {
    document.getElementById('budget-value').innerText = val == 0 ? "Sem Limite" : `R$ ${val},00`;
}

// --- SIDEBAR & NAVIGATION ---
function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebarOpen) {
        sidebar.classList.remove('closed'); sidebar.classList.add('open');
        if (window.innerWidth >= 768) main.classList.remove('expanded');
        overlay.classList.add('active');
    } else {
        sidebar.classList.add('closed'); sidebar.classList.remove('open');
        if (window.innerWidth >= 768) main.classList.add('expanded');
        overlay.classList.remove('active');
    }
}

function toggleGameMode() {
    currentGameMode = currentGameMode === 'mtg' ? 'pokemon' : 'mtg';
    // Reset
    selectedResources = []; currentDeck = [];
    document.getElementById('build-around').value = '';
    document.getElementById('game-switch').classList.toggle('pkmn-mode', currentGameMode === 'pokemon');

    // UI Reset
    document.getElementById('deck-display').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');

    updateUIForGameMode();
}

function updateUIForGameMode() {
    const config = GAMES[currentGameMode];
    document.getElementById('brand-icon').className = `fas ${config.icon} text-3xl ${config.color}`;
    document.getElementById('current-mode-label').innerText = currentGameMode === 'mtg' ? 'Magic: The Gathering' : 'Pokémon TCG';
    document.getElementById('generate-btn').className = `w-full ${config.btnColor} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95`;

    document.getElementById('deck-format').innerHTML = config.formats.map(f => `<option value="${f.val}">${f.label}</option>`).join('');
    document.getElementById('resource-label').innerText = currentGameMode === 'mtg' ? 'Cores de Mana' : 'Tipos de Energia';

    document.getElementById('resource-selector').innerHTML = config.resources.map(r => `
        <div id="btn-${r.id}" class="resource-symbol ${r.class}" onclick="toggleResource('${r.id}')" title="${r.id}">
            <i class="fas ${r.icon}"></i>
        </div>
    `).join('');

    document.getElementById('empty-text').innerText = currentGameMode === 'mtg'
        ? 'Escolha as cores e forge seu grimório.'
        : 'Escolha os tipos e capture seu deck.';

    document.getElementById('status-area').classList.add('hidden');
}

function toggleResource(id) {
    const btn = document.getElementById(`btn-${id}`);
    if (selectedResources.includes(id)) {
        selectedResources = selectedResources.filter(r => r !== id);
        btn.classList.remove('selected');
    } else {
        if (currentGameMode === 'pokemon' && selectedResources.length >= 2) {
            const removed = selectedResources.shift();
            document.getElementById(`btn-${removed}`).classList.remove('selected');
        }
        selectedResources.push(id);
        btn.classList.add('selected');
    }
}

// --- CORE GENERATOR LOGIC ---
async function generateDeck() {
    if (selectedResources.length === 0) {
        alert("Selecione pelo menos um tipo/cor."); return;
    }
    if (window.innerWidth < 768) toggleSidebar();

    // Setup UI
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('deck-display').classList.add('hidden');
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('status-area').classList.add('hidden');

    currentDeck = [];

    try {
        if (currentGameMode === 'mtg') await generateMTGDeck();
        else await generatePokemonDeck();

        renderDeck();

        // Auto-save
        localStorage.setItem('lastDeck', JSON.stringify({
            deck: currentDeck, mode: currentGameMode, colors: selectedResources
        }));

    } catch (error) {
        console.error(error);
        document.getElementById('status-area').classList.remove('hidden');
        document.getElementById('status-text').innerText = "Erro na conexão com API. Tente novamente.";
    } finally {
        document.getElementById('loading-state').classList.add('hidden');
    }
}

async function generateMTGDeck() {
    const format = document.getElementById('deck-format').value;
    const strategy = document.getElementById('deck-strategy').value;
    const buildAround = document.getElementById('build-around').value.trim();
    const budget = parseInt(document.getElementById('budget-slider').value);

    const colorQuery = selectedResources.join('');
    let query = `f:${format} c:${colorQuery} (lang:pt or lang:en)`;

    // Build Around Logic
    if (buildAround) {
        query += ` (t:"${buildAround}" or o:"${buildAround}")`;
    }

    // Fetch
    const limit = format === 'commander' ? 60 : 40;
    const creatures = await fetchScryfall(`${query} t:creature`, limit);
    const spells = await fetchScryfall(`${query} (t:instant or t:sorcery or t:enchantment) -t:creature`, limit);

    // Fill
    let creatureCount = 22, spellCount = 14, landCount = 24;
    if (format === 'commander') { creatureCount = 35; spellCount = 27; landCount = 38; }
    if (strategy === 'aggro') { creatureCount += 4; spellCount -= 2; landCount -= 2; }
    if (strategy === 'control') { creatureCount -= 10; spellCount += 10; }

    fillDeck(currentDeck, creatures, creatureCount, 'Creature', format === 'commander', budget);
    fillDeck(currentDeck, spells, spellCount, 'Spell', format === 'commander', budget);

    // Lands
    const landsPerColor = Math.floor(landCount / selectedResources.length);
    selectedResources.forEach(c => {
        const name = MTG_LANDS[c];
        currentDeck.push({
            name: name, category: 'Land', qty: landsPerColor,
            image: `https://api.scryfall.com/cards/named?exact=${name}&format=image`,
            price: 0.25, link: '#'
        });
    });
    currentDeck.sort((a, b) => (a.cost || 0) - (b.cost || 0));
}

async function generatePokemonDeck() {
    const buildAround = document.getElementById('build-around').value.trim();
    let query = `supertype:Pokémon (${selectedResources.map(t => `types:${t}`).join(' OR ')})`;

    if (buildAround) query += ` name:"${buildAround}*"`;

    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${query}&pageSize=50`);
    const data = await res.json();
    let pool = data.data.sort(() => 0.5 - Math.random());

    fillDeck(currentDeck, pool, 16, 'Pokemon', false, 0); // Budget logic harder for Pokemon due to API structure

    // Trainers
    let tCount = 0;
    while (tCount < 32) {
        const name = PKMN_STAPLES[tCount % PKMN_STAPLES.length];
        currentDeck.push({
            name: name, category: 'Trainer', qty: 4,
            image: "https://assets.tcgdex.net/en/swsh/swsh1/178/high.webp",
            price: 1.50, link: '#'
        });
        tCount += 4;
    }

    // Energy
    const eCount = Math.floor(12 / selectedResources.length);
    selectedResources.forEach(t => {
        currentDeck.push({
            name: `Energia ${t}`, category: 'Energy', qty: eCount,
            image: PKMN_ENERGY_IMGS[t], price: 0.20, link: '#'
        });
    });
}

async function fetchScryfall(q, limit) {
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=edhrec&unique=cards`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data.sort(() => 0.5 - Math.random());
}

function fillDeck(deck, pool, target, cat, singleton, budget) {
    let count = 0;
    let i = 0;

    // Max allowed price per card if budget is strict (simple heuristic: budget / 60 cards * 2 for slack)
    const maxCardPrice = budget > 0 ? (budget / 60) * 3 : 99999;

    while (count < target && i < pool.length) {
        const card = pool[i];
        let price = 0;
        let img = '';
        let cost = 0;
        let link = '#';

        // normalize data
        if (currentGameMode === 'mtg') {
            price = parseFloat(card.prices?.usd || 0) * currentUsdRate;
            img = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
            cost = card.cmc || 0;
            link = card.scryfall_uri;
        } else {
            if (card.tcgplayer?.prices) {
                const prices = Object.values(card.tcgplayer.prices);
                if (prices.length > 0) price = (prices[0].mid || 0) * currentUsdRate;
            }
            img = card.images.small;
            link = card.tcgplayer?.url;
        }

        // Budget Filter
        if (budget > 0 && price > maxCardPrice) {
            i++; continue; // Skip expensive card
        }

        let qty = singleton ? 1 : Math.floor(Math.random() * 2) + 2;
        if (currentGameMode === 'mtg' && card.type_line?.includes('Legendary')) qty = 1;
        if (count + qty > target) qty = target - count;

        deck.push({
            name: card.name, category: cat, qty: qty,
            image: img || "https://via.placeholder.com/250",
            price: price, cost: cost, link: link
        });

        count += qty;
        i++;
    }
}

// --- RENDER ---
function renderDeck() {
    const container = document.getElementById('deck-display');
    container.innerHTML = '';

    currentDeck.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card-container group relative cursor-pointer';
        div.onclick = () => showModal(card.image, card.price, card.link);
        div.innerHTML = `
            <div class="relative rounded-lg overflow-hidden bg-gray-900 shadow-xl border border-gray-800">
                <img src="${card.image}" class="w-full object-contain aspect-[5/7]" loading="lazy">
                <span class="card-qty">${card.qty}</span>
            </div>
            <p class="mt-2 text-center text-xs font-bold truncate text-gray-400 group-hover:text-white">${card.name}</p>
        `;
        container.appendChild(div);
    });

    updateStats();
    document.getElementById('dashboard').classList.remove('hidden');
    container.classList.remove('hidden');
}

function updateStats() {
    let total = 0, price = 0, c1 = 0, c2 = 0, c3 = 0;
    currentDeck.forEach(c => {
        total += c.qty; price += (c.price * c.qty);
        if (['Creature', 'Pokemon'].includes(c.category)) c1 += c.qty;
        else if (['Land', 'Energy'].includes(c.category)) c3 += c.qty;
        else c2 += c.qty;
    });

    document.getElementById('deck-price').innerText = `R$ ${price.toFixed(2).replace('.', ',')}`;
    document.getElementById('total-count').innerText = total;
    document.getElementById('stat-type-1').innerText = c1;
    document.getElementById('stat-type-2').innerText = c2;
    document.getElementById('stat-type-3').innerText = c3;

    // Chart
    const chartC = document.getElementById('chart-container');
    chartC.innerHTML = ''; document.getElementById('chart-labels').innerHTML = '';

    let data = {};
    if (currentGameMode === 'mtg') {
        data = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        currentDeck.forEach(c => {
            if (c.category !== 'Land') {
                let cmc = Math.floor(c.cost || 1);
                if (cmc < 1) cmc = 1; if (cmc > 6) cmc = 6;
                data[cmc] += c.qty;
            }
        });
    } else {
        data = { "PKMN": c1, "TRNR": c2, "NRG": c3 };
    }

    const max = Math.max(...Object.values(data), 1);
    Object.keys(data).forEach(k => {
        const h = (data[k] / max) * 100;
        const bar = document.createElement('div');
        bar.className = 'w-full bg-blue-600 opacity-80 rounded-t relative group flex flex-col justify-end items-center';
        bar.style.height = `${h}%`;
        if (data[k] > 0) bar.innerHTML = `<span class="mb-1 text-xs font-bold text-white">${data[k]}</span>`;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col justify-end w-full h-full';
        wrapper.appendChild(bar);
        chartC.appendChild(wrapper);

        const l = document.createElement('span'); l.innerText = k;
        document.getElementById('chart-labels').appendChild(l);
    });
}

// --- NEW FEATURES ---
function saveDeck() {
    if (currentDeck.length === 0) return alert("Gere um deck primeiro.");
    localStorage.setItem('savedDeck_User', JSON.stringify({ deck: currentDeck, mode: currentGameMode, colors: selectedResources }));
    alert("Deck salvo nos favoritos locais!");
}

function loadDeck() {
    const s = localStorage.getItem('savedDeck_User');
    if (!s) return alert("Nenhum deck salvo encontrado.");
    const p = JSON.parse(s);
    currentDeck = p.deck; currentGameMode = p.mode; selectedResources = p.colors;
    updateUIForGameMode(); renderDeck();
    alert("Deck carregado!");
}

function playtestHand() {
    if (currentDeck.length === 0) return;
    const handContainer = document.getElementById('hand-display');
    handContainer.innerHTML = '';

    // Create a flat array of cards based on qty
    let library = [];
    currentDeck.forEach(c => {
        for (let i = 0; i < c.qty; i++) library.push(c);
    });

    // Shuffle and pick 7
    library.sort(() => 0.5 - Math.random());
    const hand = library.slice(0, 7);

    hand.forEach(card => {
        const img = document.createElement('img');
        img.src = card.image;
        img.className = "h-48 md:h-64 rounded-lg shadow-2xl hover:scale-110 transition-transform cursor-pointer border border-gray-600";
        handContainer.appendChild(img);
    });

    document.getElementById('hand-modal').classList.remove('hidden');
}

function openMosaicMode() {
    if (currentDeck.length === 0) return;
    const container = document.getElementById('mosaic-container');
    container.innerHTML = '';

    // Sort by Type then Cost
    currentDeck.sort((a, b) => a.category.localeCompare(b.category) || (a.cost - b.cost));

    // Flatten for visual appeal
    let library = [];
    currentDeck.forEach(c => {
        for (let i = 0; i < c.qty; i++) library.push(c);
    });

    library.forEach(card => {
        const img = document.createElement('img');
        img.src = card.image;
        container.appendChild(img);
    });

    document.getElementById('mosaic-modal').classList.remove('hidden');
}

function closeMosaicMode() { document.getElementById('mosaic-modal').classList.add('hidden'); }

// --- UTILS ---
function showModal(src, p, l) {
    document.getElementById('modal-img').src = src;
    document.getElementById('modal-price').innerText = p > 0 ? `R$ ${p.toFixed(2)}` : '--';
    document.getElementById('modal-link').href = l;
    document.getElementById('card-modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('card-modal').classList.add('hidden'); }

function copyToClipboard() {
    const text = currentDeck.map(c => `${c.qty} ${c.name}`).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("Lista copiada!"));
}

function toggleGuidePage() {
    const p = document.getElementById('guide-page');
    if (p.classList.contains('hidden')) { populateGuide(); p.classList.remove('hidden'); }
    else p.classList.add('hidden');
}

async function populateGuide() {
    const div = document.getElementById('guide-content');
    const subtitle = document.getElementById('guide-subtitle');
    
    div.innerHTML = '<div class="flex justify-center p-10"><div class="loader"></div></div>';
    
    const file = currentGameMode === 'mtg' ? 'guides/mtg.html' : 'guides/pokemon.html';
    subtitle.innerText = currentGameMode === 'mtg' ? '- Guia do Planeswalker' : '- Manual do Treinador';

    try {
        const res = await fetch(file);
        if(!res.ok) throw new Error("Guia não encontrado");
        const html = await res.text();
        div.innerHTML = html;
    } catch (e) {
        div.innerHTML = `<p class='text-red-500 text-center'>Erro ao carregar guia: ${e.message}</p>`;
    }
}

// Search
function handleSearchKey(e) { if (e.key === 'Enter') searchCard(); }
async function searchCard() {
    const term = document.getElementById('card-search').value.trim();
    if (!term) return;

    const btn = document.querySelector('button[onclick="searchCard()"] i');
    const originalIcon = btn.className;
    btn.className = "fas fa-spinner fa-spin";

    try {
        let cardData = null;

        if (currentGameMode === 'mtg') {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(term)}`);
            if (!res.ok) throw new Error("Carta não encontrada");
            const data = await res.json();
            
            cardData = {
                name: data.name,
                category: data.type_line.includes('Land') ? 'Land' : (data.type_line.includes('Creature') ? 'Creature' : 'Spell'),
                qty: 1,
                image: data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal,
                price: parseFloat(data.prices?.usd || 0) * currentUsdRate,
                cost: data.cmc || 0,
                link: data.scryfall_uri
            };

        } else {
            const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(term)}*"&pageSize=1`);
            const data = await res.json();
            if (data.data.length === 0) throw new Error("Carta não encontrada");
            const card = data.data[0];

            let price = 0;
            if (card.tcgplayer?.prices) {
                const prices = Object.values(card.tcgplayer.prices);
                if (prices.length > 0) price = (prices[0].mid || 0) * currentUsdRate;
            }

            cardData = {
                name: card.name,
                category: card.supertype === 'Pokémon' ? 'Pokemon' : (card.supertype === 'Energy' ? 'Energy' : 'Trainer'),
                qty: 1,
                image: card.images.small,
                price: price,
                cost: 0,
                link: card.tcgplayer?.url || '#'
            };
        }

        if (cardData) {
            // Check if already exists
            const existing = currentDeck.find(c => c.name === cardData.name);
            if (existing) {
                existing.qty++;
            } else {
                currentDeck.push(cardData);
            }
            
            renderDeck();
            document.getElementById('card-search').value = '';
            
            // Auto-save
            localStorage.setItem('lastDeck', JSON.stringify({
                deck: currentDeck, mode: currentGameMode, colors: selectedResources
            }));
        }

    } catch (error) {
        alert(error.message || "Erro ao buscar carta");
    } finally {
        btn.className = originalIcon;
    }
}

function returnToHome() {
    if (window.innerWidth < 768) toggleSidebar();
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('deck-display').classList.add('hidden');
}
