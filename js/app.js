// ===== DATA LOADER =====
const DATA = { planets: null, houses: null, aspects: null };

async function loadAll() {
  const [p, h, a] = await Promise.all([
    fetch('./data/planets.json').then(r => r.json()),
    fetch('./data/houses.json').then(r => r.json()),
    fetch('./data/aspects.json').then(r => r.json()),
  ]);
  DATA.planets = p.planets;
  DATA.houses = h.houses;
  DATA.aspects = a.aspects;
}

// ===== STARS BG =====
function createStars(n = 80) {
  const bg = document.getElementById('stars-bg');
  if (!bg) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2 + 1;
    s.style.cssText = `
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      width:${size}px;height:${size}px;
      --d:${(Math.random()*4+2).toFixed(1)}s;
      --o:${(Math.random()*0.5+0.2).toFixed(2)};
      animation-delay:${(Math.random()*5).toFixed(1)}s;
    `;
    bg.appendChild(s);
  }
}

// ===== NOTES (localStorage) =====
const NOTES_KEY = 'hoshiyomi_notes';
function getNotes() { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); }
function saveNote(id, text) {
  const notes = getNotes();
  notes[id] = { text, updatedAt: new Date().toISOString() };
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
function getNote(id) { return getNotes()[id] || null; }

// ===== MODAL =====
function openModal(item, type) {
  const overlay = document.getElementById('modal-overlay');
  const m = document.getElementById('modal-content');
  const note = getNote(item.id || String(item.number));

  let symbol = item.symbol || `${item.number}`;
  let titleJa = item.name_ja || item.name_ja;
  let titleEn = item.name_en || '';
  let sub = '';
  let bodyHtml = '';

  if (type === 'planet') {
    sub = `${item.symbol}  エネルギー：${item.energy_type}`;
    bodyHtml = `
      <div class="modal-section">
        <h3>キーワード</h3>
        <div class="item-keywords">${(item.keywords_ja||[]).map(k=>`<span class="keyword-tag">${k}</span>`).join('')}</div>
      </div>
      <div class="modal-section">
        <h3>意味・解釈</h3>
        <p>${item.meaning_ja || ''}</p>
      </div>
      <div class="modal-section">
        <h3>象徴するもの</h3>
        <p>${(item.symbolizes_ja||[]).join('・')}</p>
      </div>
      ${item.age_theme_ja ? `<div class="modal-section"><h3>年齢域</h3><p>${item.age_theme_ja}</p></div>` : ''}
      ${item.transit_effect_ja ? `<div class="modal-section"><h3>トランジット効果</h3><p>${item.transit_effect_ja}</p></div>` : ''}
    `;
  } else if (type === 'house') {
    symbol = `第${item.number}ハウス`;
    sub = `支配星座：${item.ruling_sign_ja}　支配天体：${item.ruling_planet_ja}`;
    bodyHtml = `
      <div class="modal-section">
        <h3>キーワード</h3>
        <div class="item-keywords">${(item.keywords_ja||[]).map(k=>`<span class="keyword-tag">${k}</span>`).join('')}</div>
      </div>
      <div class="modal-section">
        <h3>人生領域</h3>
        <p>${item.life_areas_ja || ''}</p>
      </div>
      ${item.body_parts_ja ? `<div class="modal-section"><h3>身体部位</h3><p>${item.body_parts_ja.join('・')}</p></div>` : ''}
      <div class="modal-section">
        <h3>読み方のコツ</h3>
        <p>${item.reading_tips_ja || ''}</p>
      </div>
    `;
  } else if (type === 'aspect') {
    sub = `${item.degrees}° / オーブ ${item.orb}°`;
    const natClass = item.nature_category === 'soft' ? 'tag-soft' : item.nature_category === 'hard' ? 'tag-hard' : 'tag-neutral';
    bodyHtml = `
      <div class="modal-section">
        <h3>性質</h3>
        <span class="badge ${natClass}">${item.nature_ja}</span>
      </div>
      <div class="modal-section">
        <h3>キーワード</h3>
        <div class="item-keywords">${(item.keywords_ja||[]).map(k=>`<span class="keyword-tag">${k}</span>`).join('')}</div>
      </div>
      <div class="modal-section">
        <h3>意味・解釈</h3>
        <p>${item.meaning_ja || ''}</p>
      </div>
      <div class="modal-section">
        <h3>読み方のコツ</h3>
        <p>${item.reading_tips_ja || ''}</p>
      </div>
    `;
  }

  const noteId = item.id || String(item.number);
  m.innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>
    <span class="modal-symbol">${symbol}</span>
    <h2>${titleJa} <small style="color:var(--text-muted);font-size:0.7em;font-weight:400">${titleEn}</small></h2>
    <p class="modal-sub">${sub}</p>
    ${bodyHtml}
    <div class="modal-section">
      <h3>マイメモ</h3>
      <textarea class="modal-note-area" id="modal-note" placeholder="ここに自分の解釈やメモを...">${note ? note.text : ''}</textarea>
      <button class="modal-note-save" onclick="saveModalNote('${noteId}')">保存</button>
      <span class="saved-badge" id="saved-badge">保存しました ✓</span>
    </div>
  `;
  overlay.classList.add('open');
}

function saveModalNote(id) {
  const text = document.getElementById('modal-note').value;
  saveNote(id, text);
  const badge = document.getElementById('saved-badge');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 2000);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ===== DICTIONARY PAGE =====
async function initDictionary() {
  await loadAll();
  let currentTab = 'planet';
  let searchQ = '';

  const tabBtns = document.querySelectorAll('.tab-btn');
  const searchInput = document.getElementById('search-input');
  const list = document.getElementById('item-list');

  function energyBadge(type) {
    const map = { personal: 'badge-personal', social: 'badge-social', transpersonal: 'badge-transpersonal' };
    const label = { personal: '個人天体', social: '社会天体', transpersonal: '世代天体' };
    return `<span class="badge ${map[type]||''}">${label[type]||type}</span>`;
  }

  function renderPlanets() {
    const q = searchQ.toLowerCase();
    const items = DATA.planets.filter(p =>
      !q || p.name_ja.includes(q) || p.name_en.toLowerCase().includes(q) ||
      (p.keywords_ja||[]).some(k => k.includes(q))
    );
    if (!items.length) { list.innerHTML = '<p class="no-results">見つかりませんでした</p>'; return; }
    list.innerHTML = items.map(p => `
      <div class="item-card" onclick="openModal(DATA.planets.find(x=>x.id==='${p.id}'), 'planet')">
        <div class="item-card-header">
          <span class="item-symbol">${p.symbol}</span>
          <div>
            <div class="item-title">${p.name_ja} ${energyBadge(p.energy_type)}</div>
            <div class="item-sub">${p.name_en} / 支配サイン：${p.ruling_sign_ja.join('・')}</div>
          </div>
        </div>
        <div class="item-keywords">${(p.keywords_ja||[]).slice(0,5).map(k=>`<span class="keyword-tag">${k}</span>`).join('')}</div>
      </div>
    `).join('');
  }

  function renderHouses() {
    const q = searchQ.toLowerCase();
    const items = DATA.houses.filter(h =>
      !q || h.name_ja.includes(q) || h.name_en.toLowerCase().includes(q) ||
      (h.keywords_ja||[]).some(k => k.includes(q))
    );
    if (!items.length) { list.innerHTML = '<p class="no-results">見つかりませんでした</p>'; return; }
    list.innerHTML = items.map(h => `
      <div class="item-card" onclick="openModal(DATA.houses.find(x=>x.number===${h.number}), 'house')">
        <div class="item-card-header">
          <span class="item-symbol" style="font-size:1.1rem;font-weight:700">H${h.number}</span>
          <div>
            <div class="item-title">${h.name_ja}</div>
            <div class="item-sub">${h.name_en} / ${h.ruling_sign_ja} ♦ ${h.ruling_planet_ja}</div>
          </div>
        </div>
        <div class="item-keywords">${(h.keywords_ja||[]).slice(0,5).map(k=>`<span class="keyword-tag">${k}</span>`).join('')}</div>
      </div>
    `).join('');
  }

  function renderAspects() {
    const q = searchQ.toLowerCase();
    const items = DATA.aspects.filter(a =>
      !q || a.name_ja.includes(q) || a.name_en.toLowerCase().includes(q) ||
      (a.keywords_ja||[]).some(k => k.includes(q))
    );
    if (!items.length) { list.innerHTML = '<p class="no-results">見つかりませんでした</p>'; return; }
    list.innerHTML = items.map(a => {
      const natClass = a.nature_category === 'soft' ? 'tag-soft' : a.nature_category === 'hard' ? 'tag-hard' : 'tag-neutral';
      return `
        <div class="item-card" onclick="openModal(DATA.aspects.find(x=>x.id==='${a.id}'), 'aspect')">
          <div class="item-card-header">
            <span class="item-symbol">${a.symbol}</span>
            <div>
              <div class="item-title">${a.name_ja} <span class="badge ${natClass}" style="font-size:0.72rem">${a.degrees}°</span></div>
              <div class="item-sub">${a.name_en} / オーブ ${a.orb}°</div>
            </div>
          </div>
          <div class="item-keywords">${(a.keywords_ja||[]).slice(0,5).map(k=>`<span class="keyword-tag">${k}</span>`).join('')}</div>
        </div>
      `;
    }).join('');
  }

  function render() {
    if (currentTab === 'planet') renderPlanets();
    else if (currentTab === 'house') renderHouses();
    else renderAspects();
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      render();
    });
  });

  searchInput.addEventListener('input', e => { searchQ = e.target.value; render(); });
  render();
}

// ===== QUIZ PAGE =====
async function initQuiz() {
  await loadAll();
  let pool = [];
  let questions = [];
  let current = 0;
  let score = 0;

  const startBtn = document.getElementById('quiz-start');
  const cardEl = document.getElementById('quiz-card');
  const resultEl = document.getElementById('quiz-result');

  function buildPool(cats) {
    pool = [];
    if (cats.includes('planet')) {
      DATA.planets.forEach(p => {
        pool.push({
          q: `この天体が象徴するキーワードはどれ？\n「${p.symbol} ${p.name_ja}」`,
          a: p.keywords_ja[0],
          choices: p.keywords_ja.slice(0,1),
          category: '天体',
          hint: p.meaning_ja.slice(0,60) + '…',
          all: p.keywords_ja,
          pool_type: 'keyword',
          item: p,
          itype: 'planet',
        });
        pool.push({
          q: `次の説明はどの天体？\n「${p.meaning_ja.slice(0,60)}…」`,
          a: p.name_ja,
          category: '天体',
          hint: `答えは「${p.name_ja}（${p.symbol}）」`,
          all_names: DATA.planets.map(x => x.name_ja),
          pool_type: 'name',
          item: p,
          itype: 'planet',
        });
      });
    }
    if (cats.includes('house')) {
      DATA.houses.forEach(h => {
        pool.push({
          q: `第${h.number}ハウスが司る人生領域は？`,
          a: h.keywords_ja[0],
          category: 'ハウス',
          hint: h.life_areas_ja.slice(0,60) + '…',
          all: h.keywords_ja,
          all_names: DATA.houses.map(x => x.keywords_ja[0]),
          pool_type: 'keyword',
          item: h,
          itype: 'house',
        });
      });
    }
    if (cats.includes('aspect')) {
      DATA.aspects.forEach(a => {
        pool.push({
          q: `「${a.name_ja}（${a.symbol}）」の角度は？`,
          a: `${a.degrees}°`,
          category: 'アスペクト',
          hint: a.meaning_ja.slice(0,60) + '…',
          pool_type: 'degree',
          item: a,
          itype: 'aspect',
        });
      });
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function makeChoices(q) {
    let wrong = [];
    if (q.pool_type === 'keyword') {
      const pool_all = q.all_names
        ? q.all_names.filter(x => x !== q.a)
        : (q.all || []).filter(x => x !== q.a);
      wrong = shuffle([...pool_all]).slice(0, 3);
    } else if (q.pool_type === 'name') {
      wrong = shuffle([...q.all_names.filter(x => x !== q.a)]).slice(0, 3);
    } else if (q.pool_type === 'degree') {
      const degs = DATA.aspects.map(a => `${a.degrees}°`).filter(d => d !== q.a);
      wrong = shuffle([...degs]).slice(0, 3);
    }
    while (wrong.length < 3) wrong.push('---');
    return shuffle([q.a, ...wrong.slice(0, 3)]);
  }

  function renderQuestion() {
    if (current >= questions.length) { showResult(); return; }
    const q = questions[current];
    const choices = makeChoices(q);
    cardEl.innerHTML = `
      <div class="quiz-progress">問題 ${current+1} / ${questions.length} <span class="quiz-score-inline">スコア: ${score}</span></div>
      <div class="quiz-question">${q.q.replace(/\n/g,'<br>')}</div>
      <div class="quiz-category">${q.category}</div>
      <div class="quiz-choices">
        ${choices.map(c => `<button class="choice-btn" onclick="answerQuiz('${encodeURIComponent(c)}', '${encodeURIComponent(q.a)}')">${c}</button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quiz-feedback"></div>
      <div class="quiz-next" id="quiz-next">
        <button class="btn-primary" onclick="nextQuestion()">次の問題へ →</button>
      </div>
    `;
  }

  window.answerQuiz = function(choiceEnc, answerEnc) {
    const choice = decodeURIComponent(choiceEnc);
    const answer = decodeURIComponent(answerEnc);
    const btns = document.querySelectorAll('.choice-btn');
    btns.forEach(b => {
      b.disabled = true;
      if (b.textContent === answer) b.classList.add('correct');
      if (b.textContent === choice && choice !== answer) b.classList.add('wrong');
    });
    const fb = document.getElementById('quiz-feedback');
    const q = questions[current];
    if (choice === answer) {
      score++;
      fb.className = 'quiz-feedback show correct';
      fb.textContent = '正解！ ' + (q.hint || '');
    } else {
      fb.className = 'quiz-feedback show wrong';
      fb.textContent = `不正解…正解は「${answer}」　${q.hint || ''}`;
    }
    document.getElementById('quiz-next').className = 'quiz-next show';
  };

  window.nextQuestion = function() {
    current++;
    renderQuestion();
  };

  function showResult() {
    cardEl.style.display = 'none';
    const pct = Math.round(score / questions.length * 100);
    const msg = pct >= 80 ? '素晴らしい！星読みマスターに近づいてる✨' : pct >= 50 ? 'いい調子！もう少しで完璧だ🌙' : 'まだまだ伸びしろあり！復習してみて🌟';
    resultEl.innerHTML = `
      <div class="result-score">${score} / ${questions.length}</div>
      <div class="result-msg">${pct}点 — ${msg}</div>
      <button class="btn-primary" onclick="location.reload()">もう一度</button>
    `;
    resultEl.style.display = 'block';
  }

  startBtn.addEventListener('click', () => {
    const cats = ['planet','house','aspect'].filter(c => document.getElementById('cat-'+c).checked);
    if (!cats.length) { alert('カテゴリを1つ以上選んでね'); return; }
    buildPool(cats);
    questions = shuffle([...pool]).slice(0, 10);
    current = 0; score = 0;
    document.querySelector('.quiz-settings').style.display = 'none';
    cardEl.style.display = 'block';
    renderQuestion();
  });
}

// ===== MEMO PAGE =====
async function initMemo() {
  await loadAll();
  const allItems = [
    ...DATA.planets.map(p => ({ id: p.id, name: p.name_ja, symbol: p.symbol, type: 'planet' })),
    ...DATA.houses.map(h => ({ id: String(h.number), name: h.name_ja, symbol: `H${h.number}`, type: 'house' })),
    ...DATA.aspects.map(a => ({ id: a.id, name: a.name_ja, symbol: a.symbol, type: 'aspect' })),
  ];

  let activeId = null;
  const memoList = document.getElementById('memo-list');
  const memoMain = document.getElementById('memo-main');

  function renderList() {
    const notes = getNotes();
    memoList.innerHTML = allItems.map(item => {
      const note = notes[item.id];
      const preview = note ? note.text.slice(0,30).replace(/\n/g,' ') : 'メモなし';
      const hasNote = note && note.text;
      return `
        <div class="memo-list-item ${activeId === item.id ? 'active' : ''}" onclick="selectMemo('${item.id}')">
          <span class="memo-item-sym">${item.symbol}</span>
          <div style="overflow:hidden">
            <div class="memo-item-name" style="${hasNote ? '' : 'color:var(--text-muted)'}">${item.name}</div>
            <div class="memo-item-preview">${preview}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.selectMemo = function(id) {
    activeId = id;
    const item = allItems.find(x => x.id === id);
    const note = getNote(id);
    renderList();
    const ts = note ? new Date(note.updatedAt).toLocaleString('ja-JP') : '';
    memoMain.innerHTML = `
      <div class="memo-main-header">
        <h2>${item.symbol} ${item.name}</h2>
        <p style="color:var(--text-muted);font-size:0.85rem">${item.type === 'planet' ? '天体' : item.type === 'house' ? 'ハウス' : 'アスペクト'}</p>
      </div>
      <textarea class="memo-editor" id="active-memo" placeholder="自分なりの解釈・気づき・チャートの読み方など自由に…">${note ? note.text : ''}</textarea>
      <div class="memo-actions">
        <button class="btn-primary" onclick="saveMemo('${id}')">保存</button>
        <span class="memo-timestamp" id="memo-ts">${ts ? '最終更新: '+ts : ''}</span>
      </div>
    `;
    document.getElementById('active-memo').focus();
  };

  window.saveMemo = function(id) {
    const text = document.getElementById('active-memo').value;
    saveNote(id, text);
    const ts = new Date().toLocaleString('ja-JP');
    document.getElementById('memo-ts').textContent = '最終更新: ' + ts;
    renderList();
  };

  renderList();
}

// ===== NAV ACTIVE =====
function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path || (path === '' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ===== MODAL CLOSE ON OVERLAY CLICK =====
document.addEventListener('DOMContentLoaded', () => {
  createStars();
  setActiveNav();
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});
