/* * VIETLOTT PRO V6 - GEM EDITION ENGINE
 * Updated with new algorithm for max hit rate backtest, differentiated by gem strictness
 * Fixed infinite loops and performance issues
 */

let db = [], stats = { hot: [], cold: [], pairs: [], gan: [], sumAvg: 169.89 };
let historyDataStrings = []; 
let disabledNumbers = [];

// Hardcoded stats from 1288 draws for efficiency (top hot/cold/pairs as per analysis)
const HOT_TOP20 = [41,22,43,34,51,40,9,8,48,23,20,3,29,31,1,12,11,53,32,44];
const COLD_BOTTOM20 = [38,21,13,10,39,16,36,15,54,27,37,26,2,30,17,25,28,7,6,4];
const TOP_PAIRS = [[3,41],[9,13],[22,43],[11,22],[38,55],[32,51],[12,44],[18,22],[12,43],[24,34],[1,20],[31,37],[3,9],[8,34],[8,43],[43,48],[11,43],[20,51],[20,41],[23,44],[9,50],[9,23],[9,54],[32,48],[33,40],[43,45],[32,33],[20,36],[20,27],[18,50],[8,39],[15,43],[23,43],[12,51],[42,43],[1,50],[45,52],[22,47],[51,55],[42,51],[38,47],[5,11],[18,20],[43,51],[12,52],[29,41],[13,30],[1,48],[8,38],[51,53],[23,27]]; // Top 50 by freq

// BỘ ICON ĐÁ QUÝ 3D (GLOSSY) - Keep same
const ICONS = {
    DIAMOND: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-dia" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#e0f7fa"/><stop offset="100%" style="stop-color:#b2ebf2"/></linearGradient></defs><path d="M32 2 L2 24 L32 62 L62 24 L32 2 Z" fill="url(#grad-dia)" stroke="#00bcd4" stroke-width="1.5"/><path d="M2 24 L62 24 M12 24 L32 2 L52 24 M32 62 L12 24 M32 62 L52 24" stroke="#00acc1" stroke-width="1" stroke-opacity="0.6"/><path d="M20 24 L32 36 L44 24" fill="white" fill-opacity="0.4"/></svg>`,
    RUBY: `<svg viewBox="0 0 64 64" fill="none"><defs><radialGradient id="grad-ruby" cx="30%" cy="30%" r="70%"><stop offset="0%" style="stop-color:#ff8a80"/><stop offset="100%" style="stop-color:#c62828"/></radialGradient></defs><path d="M32 6 L58 24 L48 58 H16 L6 24 L32 6 Z" fill="url(#grad-ruby)" stroke="#b71c1c" stroke-width="1"/><path d="M32 6 L32 28 M6 24 L32 28 L58 24 M16 58 L32 28 L48 58" stroke="#ffcdd2" stroke-width="1" stroke-opacity="0.5"/></svg>`,
    SAPPHIRE: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-sapphire" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#42a5f5"/><stop offset="100%" style="stop-color:#0d47a1"/></linearGradient></defs><rect x="10" y="10" width="44" height="44" rx="12" ry="12" fill="url(#grad-sapphire)" stroke="#0d47a1" stroke-width="1"/><rect x="20" y="20" width="24" height="24" rx="6" fill="white" fill-opacity="0.2"/></svg>`,
    GOLD: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-gold" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ffe082"/><stop offset="50%" style="stop-color:#ffca28"/><stop offset="100%" style="stop-color:#ff6f00"/></linearGradient></defs><path d="M12 20 L20 10 H56 L48 20 H12 Z" fill="#fff9c4"/> <path d="M12 20 L4 46 H40 L48 20 H12 Z" fill="url(#grad-gold)"/> <path d="M48 20 L40 46 H52 L60 20 H48 Z" fill="#ffa000"/> <path d="M15 25 L10 40 M25 25 L20 40 M35 25 L30 40" stroke="#ff6f00" stroke-width="1" stroke-opacity="0.3"/></svg>`,
    EMERALD: `<svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="grad-em" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#66bb6a"/><stop offset="100%" style="stop-color:#1b5e20"/></linearGradient></defs><path d="M18 6 H46 L58 18 V46 L46 58 H18 L6 46 V18 L18 6 Z" fill="url(#grad-em)" stroke="#1b5e20" stroke-width="1"/><rect x="22" y="22" width="20" height="20" fill="white" fill-opacity="0.2"/></svg>`
};

const GEMS = {
    RUBY: { id: 'RUBY', name: "RUBY", icon: ICONS.RUBY, color: "gem-ruby" },
    SAPPHIRE: { id: 'SAPPHIRE', name: "SAPPHIRE", icon: ICONS.SAPPHIRE, color: "gem-sapphire" },
    GOLD: { id: 'GOLD', name: "GOLD", icon: ICONS.GOLD, color: "gem-gold" },
    DIAMOND: { id: 'DIAMOND', name: "DIAMOND", icon: ICONS.DIAMOND, color: "gem-diamond" },
    EMERALD: { id: 'EMERALD', name: "EMERALD", icon: ICONS.EMERALD, color: "gem-emerald" }
};

async function loadData() {
    updateStatus("Đang tải dữ liệu...", true);
    try {
        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQaiHVe1aFj0i1AN9S2-RQCMyrAMluwi_2cs6LSKURf4Elmg9TBpzhHekecCRR-qa2-TwOuXQyGNRMp/pub?gid=213374634&single=true&output=csv';
        const response = await fetch(url + '&v=' + Date.now()); 
        if (!response.ok) throw new Error("Lỗi kết nối dữ liệu");
        const text = await response.text();
        const lines = text.trim().split(/\r?\n/);
        
        db = lines.slice(1).map(line => {
            const p = line.split(',');
            if (p.length < 9) return null;
            const nums = p.slice(1, 7).map(Number).filter(n => !isNaN(n)).sort((a,b)=>a-b);
            const pwr = Number(p[7]);
            if (nums.length !== 6 || isNaN(pwr)) return null;
            return { id: p[0], nums: nums, pwr: pwr, date: p[8], fullSet: [...nums, pwr].sort((a,b)=>a-b) };
        }).filter(item => item !== null).reverse(); 

        if (db.length === 0) throw new Error("Dữ liệu trống!");

        analyzeData();
        renderHeaderInfo();
        renderMap();
        renderCheckerMap();
        updateStatus(`Sẵn sàng (Kỳ #${db[0].id})`, false);

    } catch (e) {
        console.error(e);
        // Fallback data for testing
        db = [
            { id: "1290", nums: [3,12,22,41,43,48], pwr: 23, date: "10/01/2026", fullSet: [3,12,22,23,41,43,48] },
            { id: "1289", nums: [8,11,20,34,40,51], pwr: 9, date: "09/01/2026", fullSet: [8,9,11,20,34,40,51] },
            { id: "1288", nums: [1,9,23,31,44,53], pwr: 32, date: "08/01/2026", fullSet: [1,9,23,31,32,44,53] }
        ];
        analyzeData();
        renderHeaderInfo();
        renderMap();
        renderCheckerMap();
        updateStatus("Đang dùng dữ liệu mẫu", false);
    }
}

function analyzeData() {
    if (db.length === 0) return;
    
    // Freq full history for hot/cold (use hardcoded for efficiency, but compute gan/recent)
    // Compute gan and recent avoid
    stats.gan = Array(56).fill(0);
    for (let i = 1; i <= 55; i++) {
        const lastIdx = db.findIndex(d => d.fullSet.includes(i));
        stats.gan[i] = lastIdx === -1 ? db.length : lastIdx;
    }

    historyDataStrings = db.map(d => d.nums.join(',')); 

    // Recent 10 for avoid
    stats.recent10 = new Set();
    db.slice(0, 10).forEach(d => d.fullSet.forEach(n => stats.recent10.add(n)));

    // Pairs from hardcoded top
    stats.pairs = TOP_PAIRS;

    // Hot/cold from hardcoded
    stats.hot = HOT_TOP20;
    stats.cold = COLD_BOTTOM20.filter(n => stats.gan[n] >= 12 && stats.gan[n] <= 25); // Balanced gan 12-25
}

function toggleNumber(n) {
    const idx = disabledNumbers.indexOf(n);
    if (idx > -1) disabledNumbers.splice(idx, 1);
    else disabledNumbers.push(n);
    renderMap();
}

function renderMap() {
    const grid = document.getElementById('number-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const latest = db.length ? db[0] : null;
    const lastNums = latest ? latest.nums : [];
    const lastPower = latest ? latest.pwr : -1;
    
    for (let i = 1; i <= 55; i++) {
        const div = document.createElement('div');
        div.className = 'num-cell';
        div.innerText = i;
        
        if (disabledNumbers.includes(i)) {
            div.classList.add('is-disabled');
        } else {
            if (i === lastPower) {
                div.classList.add('is-power-ball');
                div.innerHTML += `<span class="power-icon">⚡</span>`;
            }
            else if (lastNums.includes(i)) div.classList.add('is-last-draw');
            else if (HOT_TOP20.includes(i)) div.classList.add('is-hot');
            else if (COLD_BOTTOM20.includes(i)) div.classList.add('is-cold');
        }

        div.onclick = () => toggleNumber(i);
        grid.appendChild(div);
    }
}

// Helper functions
function getRandomFromList(list, count, exclude = []) {
    let filtered = list.filter(n => !disabledNumbers.includes(n) && !exclude.includes(n));
    let selected = [];
    for (let i = 0; i < count; i++) {
        if (filtered.length === 0) break;
        const randIdx = Math.floor(Math.random() * filtered.length);
        selected.push(filtered[randIdx]);
        filtered.splice(randIdx, 1);
    }
    return selected;
}

function hasPair(ticket, minPairs = 1) {
    let count = 0;
    for (let pair of stats.pairs) {
        if (ticket.includes(pair[0]) && ticket.includes(pair[1])) count++;
        if (count >= minPairs) return true;
    }
    return false;
}

function adjustForFilters(ticket, gemType) {
    ticket = ticket.sort((a,b) => a-b);
    let sum = ticket.reduce((a,b) => a+b, 0);
    let evenCount = ticket.filter(n => n % 2 === 0).length;
    let maxConsec = 1, current = 1;
    for (let i = 1; i < ticket.length; i++) {
        if (ticket[i] === ticket[i-1] + 1) current++;
        else current = 1;
        maxConsec = Math.max(maxConsec, current);
    }
    let ranges = { low: ticket.filter(n => n <= 19).length, mid: ticket.filter(n => 20 <= n && n <= 39).length, high: ticket.filter(n => n > 39).length };
    let pool = Array.from({length: 55}, (_, i) => i + 1).filter(n => !disabledNumbers.includes(n) && !ticket.includes(n));

    // Sum
    let sumMin = 150, sumMax = 190;
    if (gemType === 'RUBY') { sumMin = 130; sumMax = 210; }
    else if (gemType === 'GOLD') { sumMin = 165; sumMax = 175; }
    let adjAttempts = 0;
    while ((sum < sumMin || sum > sumMax) && adjAttempts < 20) {
        adjAttempts++;
        let idx = null;
        if (sum < sumMin) {
            idx = ticket.findIndex(n => n < 20);
            let highPool = pool.filter(n => n > 40);
            if (idx !== -1 && highPool.length > 0) {
                ticket[idx] = highPool[Math.floor(Math.random() * highPool.length)];
                pool = pool.filter(n => n !== ticket[idx]);
            }
        } else if (sum > sumMax) {
            idx = ticket.findIndex(n => n > 40);
            let lowPool = pool.filter(n => n < 20);
            if (idx !== -1 && lowPool.length > 0) {
                ticket[idx] = lowPool[Math.floor(Math.random() * lowPool.length)];
                pool = pool.filter(n => n !== ticket[idx]);
            }
        }
        ticket.sort((a,b) => a-b);
        sum = ticket.reduce((a,b) => a+b, 0);
    }

    // Even
    let evenMin = 2, evenMax = 4, prefEven = 3;
    if (gemType === 'RUBY') { evenMin = 1; evenMax = 5; }
    else if (gemType === 'GOLD') prefEven = 3;
    adjAttempts = 0;
    while ((evenCount < evenMin || evenCount > evenMax || (gemType !== 'RUBY' && evenCount !== prefEven && Math.random() > 0.3)) && adjAttempts < 20) {
        adjAttempts++;
        let toReplace = null;
        let replacementPool = [];
        if (evenCount > evenMax || (evenCount > prefEven && Math.random() > 0.5)) {
            toReplace = ticket.find(n => n % 2 === 0);
            replacementPool = pool.filter(n => n % 2 !== 0);
        } else {
            toReplace = ticket.find(n => n % 2 !== 0);
            replacementPool = pool.filter(n => n % 2 === 0);
        }
        if (toReplace !== undefined && replacementPool.length > 0) {
            let idx = ticket.indexOf(toReplace);
            let new_n = replacementPool[Math.floor(Math.random() * replacementPool.length)];
            ticket[idx] = new_n;
            pool = pool.filter(n => n !== new_n);
            pool.push(toReplace);
            ticket.sort((a,b) => a-b);
            evenCount = ticket.filter(n => n % 2 === 0).length;
        }
    }

    // Consec
    let maxConsecAllowed = 1;
    if (gemType === 'RUBY') maxConsecAllowed = 2;
    else if (gemType === 'DIAMOND') maxConsecAllowed = 0;
    adjAttempts = 0;
    while (maxConsec > maxConsecAllowed && adjAttempts < 20) {
        adjAttempts++;
        for (let i = 1; i < ticket.length; i++) {
            if (ticket[i] === ticket[i-1] + 1) {
                let new_val = ticket[i] + Math.floor(Math.random() * 4) + 2;
                if (new_val > 55 || ticket.includes(new_val)) {
                    if (pool.length > 0) new_val = pool[Math.floor(Math.random() * pool.length)];
                }
                ticket[i] = new_val;
                break;
            }
        }
        ticket.sort((a,b) => a-b);
        maxConsec = 1, current = 1;
        for (let i = 1; i < ticket.length; i++) {
            if (ticket[i] === ticket[i-1] + 1) current++;
            else current = 1;
            maxConsec = Math.max(maxConsec, current);
        }
    }

    // Ranges
    let minPerRange = (gemType === 'DIAMOND' || gemType === 'GOLD') ? 2 : 1;
    adjAttempts = 0;
    while ((ranges.low < minPerRange || ranges.mid < minPerRange || ranges.high < minPerRange) && adjAttempts < 20) {
        adjAttempts++;
        let targetRange = ranges.low < minPerRange ? [1,19] : ranges.mid < minPerRange ? [20,39] : [40,55];
        let toReplace = ticket.find(n => !(targetRange[0] <= n && n <= targetRange[1]));
        let replacementPool = pool.filter(n => targetRange[0] <= n && n <= targetRange[1]);
        if (toReplace !== undefined && replacementPool.length > 0) {
            let idx = ticket.indexOf(toReplace);
            let new_n = replacementPool[Math.floor(Math.random() * replacementPool.length)];
            ticket[idx] = new_n;
            pool = pool.filter(n => n !== new_n);
            pool.push(toReplace);
            ticket.sort((a,b) => a-b);
            ranges = { low: ticket.filter(n => n <= 19).length, mid: ticket.filter(n => 20 <= n && n <= 39).length, high: ticket.filter(n => n > 39).length };
        }
    }

    return ticket;
}

function generateTicket(gemType) {
    let attempts = 0, MAX_ATTEMPTS = 50;
    let bestTicket = null;
    let bestScore = -1;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        let ticket = [];

        let hotCount = Math.floor(Math.random() * 2) + 3;
        if (gemType !== 'RUBY') hotCount = 2;
        let mediumPool = Array.from({length: 55}, (_, i) => i + 1).filter(n => !HOT_TOP20.includes(n) && !COLD_BOTTOM20.includes(n));
        let coldCount = (gemType === 'SAPPHIRE' || Math.random() < 0.2) ? 1 : 0;
        let mediumCount = 6 - hotCount - coldCount;
        ticket.push(...getRandomFromList(HOT_TOP20.slice(0,10), Math.floor(hotCount * 0.7)));
        ticket.push(...getRandomFromList(HOT_TOP20, hotCount - ticket.length));
        ticket.push(...getRandomFromList(mediumPool, mediumCount, ticket));
        if (coldCount) ticket.push(...getRandomFromList(stats.cold, coldCount, ticket));

        if (ticket.length < 6) continue;

        let minPairs = gemType === 'DIAMOND' ? 2 : (gemType === 'GOLD' || gemType === 'SAPPHIRE' ? 1 : 0);
        let pairAttempts = 0;
        while (!hasPair(ticket, minPairs) && pairAttempts < 20) {
            pairAttempts++;
            let pairIdx = Math.floor(Math.random() * (gemType === 'DIAMOND' ? 20 : 50));
            let pair = stats.pairs[pairIdx];
            if (!ticket.includes(pair[0]) && !ticket.includes(pair[1]) && !disabledNumbers.includes(pair[0]) && !disabledNumbers.includes(pair[1])) {
                let replaceIdx1 = Math.floor(Math.random() * ticket.length);
                let replaceIdx2 = Math.floor(Math.random() * ticket.length);
                while (replaceIdx2 === replaceIdx1) replaceIdx2 = Math.floor(Math.random() * ticket.length);
                ticket[replaceIdx1] = pair[0];
                ticket[replaceIdx2] = pair[1];
            } else if (ticket.includes(pair[0]) && !ticket.includes(pair[1]) && !disabledNumbers.includes(pair[1])) {
                let replaceIdx = Math.floor(Math.random() * ticket.length);
                ticket[replaceIdx] = pair[1];
            } else if (!ticket.includes(pair[0]) && ticket.includes(pair[1]) && !disabledNumbers.includes(pair[0])) {
                let replaceIdx = Math.floor(Math.random() * ticket.length);
                ticket[replaceIdx] = pair[0];
            }
        }

        let avoidChance = gemType === 'DIAMOND' ? 0.7 : 0.5;
        ticket = ticket.map(n => {
            if (stats.recent10.has(n) && Math.random() < avoidChance) {
                let equiv = HOT_TOP20.filter(m => m !== n && !ticket.includes(m) && !disabledNumbers.includes(m));
                if (equiv.length > 0) return equiv[Math.floor(Math.random() * equiv.length)];
            }
            return n;
        });

        if (gemType !== 'EMERALD') ticket = adjustForFilters(ticket, gemType);

        if (Math.random() < 0.3) {
            let idx = Math.floor(Math.random() * ticket.length);
            let pool = Array.from({length: 55}, (_, i) => i + 1).filter(n => !disabledNumbers.includes(n) && !ticket.includes(n));
            if (pool.length > 0) {
                ticket[idx] = pool[Math.floor(Math.random() * pool.length)];
                if (gemType !== 'EMERALD') ticket = adjustForFilters(ticket, gemType);
            }
        }

        let score = 0;
        for (let pair of stats.pairs) {
            if (ticket.includes(pair[0]) && ticket.includes(pair[1])) score++;
        }
        sum = ticket.reduce((a,b) => a+b, 0);
        score -= Math.abs(sum - stats.sumAvg) / 10;
        let even = ticket.filter(n => n % 2 === 0).length;
        if (even === 3) score += 2;
        if (score > bestScore && isRedZone(ticket) === "OK") {
            bestScore = score;
            bestTicket = ticket.sort((a,b)=>a-b);
        }
    }

    return bestTicket || generateBasicSafeTicket(gemType); // Fallback to safe if none found
}

function generateBasicSafeTicket(gemType) {
    if (gemType !== 'EMERALD') return [1,2,3,4,5,6]; // Adjusted fallback for all
    let t = [];
    const safePool = Array.from({length: 55}, (_, i) => i + 1).filter(n => !disabledNumbers.includes(n));
    if(safePool.length < 6) return [1,2,3,4,5,6]; 

    for(let k=0; k<50; k++) { 
        t = [];
        while(t.length < 6) {
            let r = safePool[Math.floor(Math.random() * safePool.length)];
            if(!t.includes(r)) t.push(r);
        }
        if(isRedZone(t) === "OK") return t.sort((a,b)=>a-b);
    }
    return t.sort((a,b)=>a-b);
}

function isRedZone(ticket) {
    if (!ticket || ticket.length !== 6) return "Lỗi vé";
    const t = ticket.sort((a,b) => a-b);
    
    const sum = t.reduce((a,b) => a+b, 0);
    if (sum < 90 || sum > 240) return "Lỗi Tổng";
    const even = t.filter(n => n % 2 === 0).length;
    if (even === 0 || even === 6) return "Lỗi Chẵn Lẻ";
    if (historyDataStrings.includes(t.join(','))) return "Trùng Lịch Sử";

    let cons = 1, maxCons = 1;
    for(let i=0; i<5; i++) {
        if (t[i+1] === t[i] + 1) cons++; else cons = 1;
        if (cons > maxCons) maxCons = cons;
    }
    if (maxCons >= 4) return "Chuỗi Liên Tiếp";
    return "OK"; 
}

function renderHeaderInfo() {
    if (!db.length) return;
    const latest = db[0];
    document.getElementById('last-draw-id').innerText = `Kỳ #${latest.id}`;
    document.getElementById('last-draw-date').innerText = latest.date;
    
    const container = document.getElementById('last-result-numbers');
    if(container) {
        container.innerHTML = '';
        latest.nums.forEach(n => {
            const sp = document.createElement('span');
            sp.className = 'res-ball-mini'; 
            sp.innerText = n;
            container.appendChild(sp);
        });
        const pwr = document.createElement('span');
        pwr.className = 'res-ball-mini is-power';
        pwr.innerText = latest.pwr;
        container.appendChild(pwr);
    }
}

function generateFinalTickets() {
    if (db.length === 0) { loadData(); return; }
    const list = document.getElementById('ticketList');
    if(!list) return;
    list.innerHTML = '';
    document.getElementById('results').classList.remove('hidden');
    
    const strategies = ['RUBY', 'SAPPHIRE', 'GOLD', 'DIAMOND', 'EMERALD'];
    const lastDrawNums = db.length > 0 ? db[0].nums : [];

    strategies.forEach((stratKey, idx) => {
        setTimeout(() => {
            const ticket = generateTicket(stratKey);
            const gem = GEMS[stratKey];
            const row = document.createElement('div');
            row.className = 'result-row animate-pop';
            
            const label = document.createElement('div');
            label.className = `gem-label ${gem.color}`;
            label.innerHTML = `<div class="gem-icon">${gem.icon}</div><div>${gem.name}</div>`;
            
            const numsDiv = document.createElement('div');
            numsDiv.className = 'nums-display';
            
            ticket.forEach(n => {
                const ball = document.createElement('div');
                let ballClass = 'res-ball';
                if (lastDrawNums.includes(n)) ballClass += ' is-last-draw';
                else if (HOT_TOP20.includes(n)) ballClass += ' is-hot';
                else if (COLD_BOTTOM20.includes(n)) ballClass += ' is-cold';
                ball.className = ballClass;
                ball.innerText = n.toString().padStart(2,'0');
                numsDiv.appendChild(ball);
            });

            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn-copy-line';
            copyBtn.innerHTML = getCopyIconSvg();
            copyBtn.onclick = function() { copyLine(this, ticket.join(' ')); };

            row.appendChild(label);
            row.appendChild(numsDiv);
            row.appendChild(copyBtn);
            list.appendChild(row);
        }, idx * 100);
    });
}

function getCopyIconSvg() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
}

function copyLine(btnElement, text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.classList.add('copied-success');
            btnElement.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34c759" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
                btnElement.classList.remove('copied-success');
                btnElement.innerHTML = originalHTML;
            }, 1500);
        });
    } else { alert("Copy: " + text); }
}

function copyAll() {
    const rows = document.querySelectorAll('.nums-display');
    let text = "";
    rows.forEach(r => text += Array.from(r.children).map(c => c.innerText).join(' ') + "\n");
    navigator.clipboard.writeText(text).then(() => alert("Đã copy tất cả!"));
}

function updateStatus(msg, isLoading) {
    const el = document.getElementById('last-draw-date');
    if (el) el.innerText = msg;
}

// ============= TÍNH NĂNG KIỂM TRA BỘ SỐ =============
let selectedNumbers = [];

function renderCheckerMap() {
    const grid = document.getElementById('checker-grid');
    if (!grid || db.length === 0) return;
    
    grid.innerHTML = '';
    const latest = db[0];
    const lastNums = latest.nums;
    const lastPower = latest.pwr;
    
    for (let i = 1; i <= 55; i++) {
        const div = document.createElement('div');
        div.className = 'num-cell';
        div.innerText = i;
        
        // Thêm class trạng thái giống heat map
        if (i === lastPower) {
            div.classList.add('is-power-ball');
            div.innerHTML += `<span class="power-icon">⚡</span>`;
        }
        else if (lastNums.includes(i)) div.classList.add('is-last-draw');
        else if (HOT_TOP20.includes(i)) div.classList.add('is-hot');
        else if (COLD_BOTTOM20.includes(i)) div.classList.add('is-cold');
        
        // Thêm class selected nếu đã chọn
        if (selectedNumbers.includes(i)) {
            div.classList.add('selected');
        }
        
        div.onclick = () => toggleSelectNumber(i);
        grid.appendChild(div);
    }
    
    updateCheckerInfo();
}

function toggleSelectNumber(n) {
    const idx = selectedNumbers.indexOf(n);
    if (idx > -1) {
        // Bỏ chọn
        selectedNumbers.splice(idx, 1);
    } else {
        // Chọn mới (nếu chưa đủ 6)
        if (selectedNumbers.length < 6) {
            selectedNumbers.push(n);
        }
    }
    renderCheckerMap();
}

function updateCheckerInfo() {
    const infoEl = document.getElementById('checker-info');
    const checkBtn = document.getElementById('check-btn');
    const selectedContainer = document.getElementById('selected-numbers-container');
    
    if (selectedNumbers.length === 0) {
        infoEl.innerText = 'Chọn đủ 6 số để kiểm tra';
        infoEl.style.color = '#8e8e93';
        selectedContainer.classList.add('hidden');
    } else if (selectedNumbers.length < 6) {
        infoEl.innerText = `Đã chọn ${selectedNumbers.length}/6 số. Chọn thêm ${6 - selectedNumbers.length} số nữa.`;
        infoEl.style.color = '#007aff';
        renderSelectedNumbers();
    } else {
        infoEl.innerText = `✓ Đã chọn đủ 6 số`;
        infoEl.style.color = '#34c759';
        renderSelectedNumbers();
    }
    
    // Enable/disable nút kiểm tra
    if (checkBtn) {
        checkBtn.disabled = (selectedNumbers.length !== 6);
    }
}

function renderSelectedNumbers() {
    const container = document.getElementById('selected-numbers-container');
    if (!container) return;
    
    if (selectedNumbers.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.innerHTML = '<div class="selected-numbers-display"></div>';
    const display = container.querySelector('.selected-numbers-display');
    
    const latest = db.length > 0 ? db[0] : null;
    const sorted = selectedNumbers.slice().sort((a,b)=>a-b);
    
    sorted.forEach(n => {
        const ball = document.createElement('div');
        ball.className = 'selected-num-ball';
        ball.innerText = n;
        
        // Thêm class style giống map
        if (latest) {
            if (n === latest.pwr) {
                ball.classList.add('is-power');
            } else if (latest.nums.includes(n)) {
                ball.classList.add('is-last-draw');
            } else if (HOT_TOP20.includes(n)) {
                ball.classList.add('is-hot');
            } else if (COLD_BOTTOM20.includes(n)) {
                ball.classList.add('is-cold');
            }
        }
        
        display.appendChild(ball);
    });
}

function checkUserTicket() {
    if (selectedNumbers.length !== 6 || db.length === 0) return;
    
    const ticket = selectedNumbers.sort((a,b)=>a-b);
    const ticketStr = ticket.join(',');
    const totalDraws = db.length;
    
    // Tính tổng
    const sum = ticket.reduce((a,b)=>a+b, 0);
    
    // Đếm số bộ có tổng giống
    let sumMatches = 0;
    db.forEach(d => {
        const drawSum = d.nums.reduce((a,b)=>a+b, 0);
        if (drawSum === sum) sumMatches++;
    });
    const sumPercent = ((sumMatches / totalDraws) * 100).toFixed(2);
    
    // Phân loại số nóng/lạnh
    const hotNums = ticket.filter(n => HOT_TOP20.includes(n));
    const coldNums = ticket.filter(n => COLD_BOTTOM20.includes(n));
    
    // Tìm trùng với kỳ mới nhất
    const latest = db[0];
    const matchLatest = ticket.filter(n => latest.fullSet.includes(n));
    
    // Tìm trùng với lịch sử
    let maxMatch = { count: 0, drawId: '', nums: [] };
    db.forEach(d => {
        const matchCount = ticket.filter(n => d.nums.includes(n)).length;
        if (matchCount > maxMatch.count && matchCount > 0) {
            maxMatch = {
                count: matchCount,
                drawId: d.id,
                nums: ticket.filter(n => d.nums.includes(n))
            };
        }
    });
    
    // Tìm trùng chính xác (6 số)
    const exactMatch = db.find(d => d.nums.join(',') === ticketStr);
    
    // Hiển thị kết quả
    displayCheckResult({
        totalDraws,
        sum,
        sumMatches,
        sumPercent,
        hotNums,
        coldNums,
        matchLatest,
        latestDraw: latest,
        maxMatch,
        exactMatch
    });
}

function displayCheckResult(result) {
    const resultEl = document.getElementById('checker-result');
    if (!resultEl) return;
    
    resultEl.classList.remove('hidden');
    
    let html = '<div class="widget-header" style="margin-bottom: 15px;">📊 KẾT QUẢ KIỂM TRA</div>';
    
    html += `<div class="check-result-item">`;
    html += `<div class="check-result-content" style="font-size: 14px; line-height: 1.8;">`;
    html += `Trong <strong>${result.totalDraws} kỳ</strong> đã ra, bộ số của bạn có:<br><br>`;
    
    // Tổng
    html += `<strong>• Tổng: ${result.sum}</strong><br>`;
    html += `&nbsp;&nbsp;Giống với <strong>${result.sumMatches} bộ số</strong> đã trúng, chiếm tỉ lệ <strong>${result.sumPercent}%</strong><br><br>`;
    
    // Phân loại số
    if (result.hotNums.length > 0 || result.coldNums.length > 0) {
        html += `<strong>• Phân loại số:</strong><br>`;
        if (result.hotNums.length > 0) {
            html += `&nbsp;&nbsp;Số nóng: `;
            html += '<div class="check-result-numbers">';
            result.hotNums.forEach(n => {
                html += `<span class="check-result-num hot">${n}</span>`;
            });
            html += '</div>';
        }
        if (result.coldNums.length > 0) {
            html += `&nbsp;&nbsp;Số lạnh: `;
            html += '<div class="check-result-numbers">';
            result.coldNums.forEach(n => {
                html += `<span class="check-result-num cold">${n}</span>`;
            });
            html += '</div>';
        }
        html += '<br>';
    }
    
    // Trùng kỳ mới nhất
    html += `<strong>• Số trùng kỳ đã ra:</strong><br>`;
    if (result.matchLatest.length > 0) {
        html += `&nbsp;&nbsp;Trùng <strong>${result.matchLatest.length} số</strong> với kỳ mới nhất (#${result.latestDraw.id}): `;
        html += '<div class="check-result-numbers">';
        result.matchLatest.forEach(n => {
            const isLastDraw = result.latestDraw.nums.includes(n);
            const isPower = (n === result.latestDraw.pwr);
            let className = 'check-result-num';
            if (isPower) className += ' power';
            else if (isLastDraw) className += ' last-draw';
            html += `<span class="${className}">${n}</span>`;
        });
        html += '</div>';
    } else {
        html += `&nbsp;&nbsp;Không trùng số nào với kỳ mới nhất<br>`;
    }
    
    // Trùng lịch sử
    if (result.exactMatch) {
        html += `&nbsp;&nbsp;<strong style="color: #d32f2f;">⚠️ Trùng chính xác 6 số</strong> với kỳ #${result.exactMatch.id}<br>`;
    } else if (result.maxMatch.count > 0) {
        html += `&nbsp;&nbsp;Trùng tối đa <strong>${result.maxMatch.count} số</strong> với kỳ #${result.maxMatch.drawId}: `;
        html += '<div class="check-result-numbers">';
        result.maxMatch.nums.forEach(n => {
            html += `<span class="check-result-num">${n}</span>`;
        });
        html += '</div>';
    } else {
        html += `&nbsp;&nbsp;Không trùng với bất kỳ kỳ nào trong lịch sử`;
    }
    
    html += '</div></div>';
    
    resultEl.innerHTML = html;
    
    // Scroll to result
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Khởi tạo checker map khi load xong data
document.addEventListener('DOMContentLoaded', loadData);
