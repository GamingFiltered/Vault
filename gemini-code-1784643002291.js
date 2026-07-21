(function(){
  const root = document.getElementById('vault-root');
  const ADMIN_PASS = 'vault123';

  // Fallback Web Storage wrapper in case window.storage isn't natively provided
  const storage = window.storage || {
    get: async (key) => {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
    }
  };

  const SEED_PRODUCTS = [
    { id:'p1', name:'Wireless ANC Headphones', category:'Tech', tags:['tech','budget','travel'], price:59.99, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Headphones', link:'https://example.com/aff/headphones', description:'Noise-cancelling over-ears with 30hr battery. Great for commutes and flights.' },
    { id:'p2', name:'Standing Desk Converter', category:'Home', tags:['home','office','health'], price:129.00, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Standing+Desk', link:'https://example.com/aff/desk', description:'Turns any desk into a sit-stand setup in seconds.' },
    { id:'p3', name:'Smart Fitness Band', category:'Fitness', tags:['fitness','tech','budget'], price:34.50, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Fitness+Band', link:'https://example.com/aff/fitband', description:'Tracks sleep, steps, and heart rate with a 10-day battery.' },
    { id:'p4', name:'Cast Iron Skillet Set', category:'Home', tags:['home','kitchen'], price:44.99, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Skillet+Set', link:'https://example.com/aff/skillet', description:'Pre-seasoned 3-piece set that lasts a lifetime.' },
    { id:'p5', name:'Mechanical Keyboard', category:'Tech', tags:['tech','office'], price:79.00, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Keyboard', link:'https://example.com/aff/keyboard', description:'Hot-swappable switches, satisfying clack, RGB you can turn off.' },
    { id:'p6', name:'Resistance Band Kit', category:'Fitness', tags:['fitness','budget','travel'], price:19.99, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Resistance+Bands', link:'https://example.com/aff/bands', description:'Full home workout in a bag you can bring anywhere.' },
    { id:'p7', name:'Minimalist Leather Wallet', category:'Fashion', tags:['fashion','budget','travel'], price:28.00, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Wallet', link:'https://example.com/aff/wallet', description:'Slim RFID-blocking wallet, fits 8 cards flat.' },
    { id:'p8', name:'Insulated Steel Bottle', category:'Fitness', tags:['fitness','travel','budget'], price:22.50, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Bottle', link:'https://example.com/aff/bottle', description:'Keeps drinks cold 24hr, hot 12hr. Survives being dropped.' },
    { id:'p9', name:'Ergonomic Office Chair', category:'Home', tags:['home','office','health'], price:189.00, image:'https://placehold.co/400x260/2E3439/C9A24B?text=Office+Chair', link:'https://example.com/aff/chair', description:'Lumbar support that actually works for long days at a desk.' }
  ];

  let products = [];
  let clicks = {};
  let commissionRate = 8;
  let isAdmin = false;
  let currentView = 'home';
  let activeCategory = 'All';

  const viewHome = document.getElementById('view-home');
  const viewQuiz = document.getElementById('view-quiz');
  const viewAdmin = document.getElementById('view-admin');
  const navButtons = root.querySelectorAll('.navlinks button');

  async function initData(){
    try {
      const p = await storage.get('vault:products');
      products = p ? JSON.parse(p.value) : SEED_PRODUCTS;
      if (!p) await storage.set('vault:products', JSON.stringify(SEED_PRODUCTS));
    } catch(e) {
      products = SEED_PRODUCTS;
      try { await storage.set('vault:products', JSON.stringify(SEED_PRODUCTS)); } catch(e2){}
    }
    try {
      const c = await storage.get('vault:clicks');
      clicks = c ? JSON.parse(c.value) : {};
    } catch(e) { clicks = {}; }
    try {
      const s = await storage.get('vault:settings');
      commissionRate = s ? JSON.parse(s.value).commissionRate : 8;
    } catch(e) { commissionRate = 8; }

    renderHome();
  }

  async function saveProducts(){
    try { await storage.set('vault:products', JSON.stringify(products)); } catch(e){ console.error('save products failed', e); }
  }
  async function saveClicks(){
    try { await storage.set('vault:clicks', JSON.stringify(clicks)); } catch(e){ console.error('save clicks failed', e); }
  }
  async function saveSettings(){
    try { await storage.set('vault:settings', JSON.stringify({commissionRate})); } catch(e){ console.error('save settings failed', e); }
  }

  async function logClick(id){
    clicks[id] = (clicks[id] || 0) + 1;
    await saveClicks();
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function switchView(v){
    currentView = v;
    viewHome.style.display = v === 'home' ? '' : 'none';
    viewQuiz.style.display = v === 'quiz' ? '' : 'none';
    viewAdmin.style.display = v === 'admin' ? '' : 'none';
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.view === v));
    if (v === 'home') renderHome();
    if (v === 'quiz') renderQuiz();
    if (v === 'admin') renderAdmin();
  }
  navButtons.forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));

  // ---------- HOME ----------
  function renderHome(){
    const cats = ['All', ...Array.from(new Set(products.map(p => p.category)))];
    const shown = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

    viewHome.innerHTML = `
      <div class="hero">
        <div class="wrap">
          <div class="eyebrow">DAILY UNLOCK</div>
          <h1>Crack the vault.</h1>
          <p class="sub">Spin the dial for a random hand-picked deal, or browse the full stash below.</p>
          <div class="dial-area">
            <div class="dial-wrap">
              <div class="dial-pointer"></div>
              <div class="dial-face" id="dial-face">
                <div class="dial-center" id="dial-center">?</div>
              </div>
            </div>
            <button class="spin-btn" id="spin-btn">Spin the Dial</button>
            <div id="unlocked-slot"></div>
          </div>
        </div>
      </div>
      <section class="block">
        <div class="wrap">
          <div class="block-head">
            <h2>The Stash</h2>
            <div class="count">${shown.length} item${shown.length===1?'':'s'}</div>
          </div>
          <div class="cat-filter" style="margin-bottom:20px;" id="cat-filter">
            ${cats.map(c => `<button data-cat="${escapeHtml(c)}" class="${c===activeCategory?'active':''}">${escapeHtml(c)}</button>`).join('')}
          </div>
          <div class="grid" id="product-grid">
            ${shown.length ? shown.map(cardHtml).join('') : '<div class="empty">No deals in this category yet.</div>'}
          </div>
        </div>
      </section>
    `;

    viewHome.querySelector('#cat-filter').addEventListener('click', e => {
      const btn = e.target.closest('button[data-cat]');
      if (!btn) return;
      activeCategory = btn.dataset.cat;
      renderHome();
    });

    viewHome.querySelectorAll('.claim-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await logClick(id);
        const prod = products.find(p => p.id === id);
        if (prod) window.open(prod.link, '_blank');
      });
    });

    document.getElementById('spin-btn').addEventListener('click', spinDial);
  }

  function cardHtml(p){
    return `
      <div class="card">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'">
        <div class="card-body">
          <div class="card-cat">${escapeHtml(p.category)}</div>
          <div class="card-title">${escapeHtml(p.name)}</div>
          <div class="card-desc">${escapeHtml(p.description)}</div>
          <div class="card-foot">
            <div class="card-price">$${Number(p.price).toFixed(2)}</div>
            <button class="claim-btn" data-id="${escapeHtml(p.id)}">Claim Deal</button>
          </div>
        </div>
      </div>
    `;
  }

  let spinning = false;
  function spinDial(){
    if (spinning || products.length === 0) return;
    spinning = true;
    const btn = document.getElementById('spin-btn');
    const face = document.getElementById('dial-face');
    const center = document.getElementById('dial-center');
    btn.disabled = true;
    center.textContent = '...';
    document.getElementById('unlocked-slot').innerHTML = '';

    const extraTurns = 4 + Math.floor(Math.random()*3);
    const finalAngle = Math.floor(Math.random()*360);
    const totalRotation = extraTurns*360 + finalAngle;
    face.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
      const winner = products[Math.floor(Math.random()*products.length)];
      center.textContent = 'OPEN';
      document.getElementById('unlocked-slot').innerHTML = `
        <div class="unlocked-card">
          <div class="tag">UNLOCKED</div>
          <div class="card-title" style="margin-bottom:6px;">${escapeHtml(winner.name)}</div>
          <div class="card-desc" style="margin-bottom:12px;">${escapeHtml(winner.description)}</div>
          <div class="card-foot">
            <div class="card-price">$${Number(winner.price).toFixed(2)}</div>
            <button class="claim-btn" id="unlocked-claim" data-id="${escapeHtml(winner.id)}">Claim Deal</button>
          </div>
        </div>
      `;
      document.getElementById('unlocked-claim').addEventListener('click', async () => {
        await logClick(winner.id);
        window.open(winner.link, '_blank');
      });
      btn.disabled = false;
      spinning = false;
    }, 2250);
  }

  // ---------- QUIZ ----------
  const QUIZ_QUESTIONS = [
    { q: "What's today's mission?", options: [
      { label: 'Upgrade my workspace', tag: 'office' },
      { label: 'Level up my fitness', tag: 'fitness' },
      { label: 'Improve my home', tag: 'home' },
      { label: 'Just want cool tech', tag: 'tech' },
    ]},
    { q: "What's your budget?", options: [
      { label: 'Under $30', tag: 'budget' },
      { label: '$30 - $80', tag: 'mid' },
      { label: 'No limit, surprise me', tag: 'any' },
    ]},
    { q: "Any other priority?", options: [
      { label: 'Needs to be portable', tag: 'travel' },
      { label: 'Health matters most', tag: 'health' },
      { label: 'No preference', tag: 'any' },
    ]}
  ];
  let quizStep = 0;
  let quizTags = [];

  function renderQuiz(){
    if (quizStep >= QUIZ_QUESTIONS.length) {
      renderQuizResult();
      return;
    }
    const q = QUIZ_QUESTIONS[quizStep];
    viewQuiz.innerHTML = `
      <section class="block" style="border-bottom:none;">
        <div class="wrap">
          <div class="quiz-box">
            <div class="quiz-progress">
              ${QUIZ_QUESTIONS.map((_,i) => `<div class="${i<=quizStep?'done':''}"></div>`).join('')}
            </div>
            <div class="quiz-step-label">STEP ${quizStep+1} OF ${QUIZ_QUESTIONS.length}</div>
            <div class="quiz-q">${escapeHtml(q.q)}</div>
            <div class="quiz-opts">
              ${q.options.map((o,i) => `<button data-idx="${i}">${escapeHtml(o.label)}</button>`).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
    viewQuiz.querySelectorAll('.quiz-opts button').forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = q.options[Number(btn.dataset.idx)];
        if (opt.tag !== 'any' && opt.tag !== 'mid') quizTags.push(opt.tag);
        quizStep++;
        renderQuiz();
      });
    });
  }

  function renderQuizResult(){
    let matches = products.filter(p => quizTags.some(t => p.tags.includes(t)));
    if (matches.length === 0) matches = products.slice(0,3);
    matches = matches.slice(0,3);

    viewQuiz.innerHTML = `
      <section class="block" style="border-bottom:none;">
        <div class="wrap">
          <div class="block-head">
            <h2>Your Matches</h2>
          </div>
          <div class="grid">
            ${matches.map(cardHtml).join('')}
          </div>
          <button class="quiz-restart" id="quiz-restart">Start Over</button>
        </div>
      </section>
    `;
    viewQuiz.querySelectorAll('.claim-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await logClick(id);
        const prod = products.find(p => p.id === id);
        if (prod) window.open(prod.link, '_blank');
      });
    });
    document.getElementById('quiz-restart').addEventListener('click', () => {
      quizStep = 0; quizTags = [];
      renderQuiz();
    });
  }

  // ---------- ADMIN ----------
  function renderAdmin(){
    if (!isAdmin) {
      viewAdmin.innerHTML = `
        <section class="block" style="border-bottom:none;">
          <div class="wrap">
            <div class="admin-login">
              <div class="eyebrow" style="text-align:center;">RESTRICTED</div>
              <h2>Enter the Vault</h2>
              <input type="password" id="admin-pass" placeholder="Admin password">
              <button class="add-btn" id="admin-login-btn" style="width:100%;">Unlock Admin</button>
              <div id="admin-error" style="color:var(--copper); font-size:12px; margin-top:8px;"></div>
              <div style="color:var(--parchment-dim); font-size:11px; margin-top:14px;">Demo password: vault123 &mdash; client-side only authentication.</div>
            </div>
          </div>
        </section>
      `;
      document.getElementById('admin-login-btn').addEventListener('click', () => {
        const val = document.getElementById('admin-pass').value;
        if (val === ADMIN_PASS) { isAdmin = true; renderAdmin(); }
        else document.getElementById('admin-error').textContent = 'Wrong password.';
      });
      return;
    }

    const totalClicks = Object.values(clicks).reduce((a,b) => a+b, 0);
    const estRevenue = products.reduce((sum,p) => sum + (clicks[p.id]||0) * p.price * (commissionRate/100), 0);
    const sortedByClicks = [...products].sort((a,b) => (clicks[b.id]||0) - (clicks[a.id]||0));

    viewAdmin.innerHTML = `
      <section class="block" style="border-bottom:none;">
        <div class="wrap">
          <div class="block-head"><h2>Admin Dashboard</h2></div>

          <div class="stat-row">
            <div class="stat-card"><div class="stat-num mono">${products.length}</div><div class="stat-label">Products Live</div></div>
            <div class="stat-card"><div class="stat-num mono">${totalClicks}</div><div class="stat-label">Total Claim Clicks</div></div>
            <div class="stat-card"><div class="stat-num mono">$${estRevenue.toFixed(2)}</div><div class="stat-label">Est. Revenue</div></div>
          </div>

          <div class="settings-row">
            Commission rate: <input type="number" id="commission-input" value="${commissionRate}" min="0" max="100" step="0.5"> %
            <button class="quiz-restart" id="save-commission" style="margin-top:0;">Save</button>
          </div>

          <h3 style="font-size:16px; margin-bottom:12px;">Click Performance</h3>
          <table style="margin-bottom:32px;">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Clicks</th><th>Est. Revenue</th></tr></thead>
            <tbody>
              ${sortedByClicks.map(p => `
                <tr>
                  <td>${escapeHtml(p.name)}</td>
                  <td>${escapeHtml(p.category)}</td>
                  <td class="mono">$${Number(p.price).toFixed(2)}</td>
                  <td class="mono">${clicks[p.id]||0}</td>
                  <td class="mono">$${((clicks[p.id]||0)*p.price*(commissionRate/100)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3 style="font-size:16px; margin-bottom:12px;">Add a Product</h3>
          <div class="admin-form">
            <div class="form-grid">
              <div><label>Name</label><input id="f-name" placeholder="Product name"></div>
              <div><label>Category</label><input id="f-category" placeholder="e.g. Tech"></div>
            </div>
            <div class="form-grid">
              <div><label>Price ($)</label><input id="f-price" type="number" step="0.01" placeholder="29.99"></div>
              <div><label>Tags (comma separated)</label><input id="f-tags" placeholder="tech, budget, travel"></div>
            </div>
            <div class="form-grid full">
              <div><label>Image URL</label><input id="f-image" placeholder="https://..."></div>
            </div>
            <div class="form-grid full">
              <div><label>Affiliate Link</label><input id="f-link" placeholder="https://..."></div>
            </div>
            <div class="form-grid full">
              <div><label>Description</label><textarea id="f-desc" rows="2" placeholder="One line about the product"></textarea></div>
            </div>
            <button class="add-btn" id="add-product-btn">Add Product</button>
            <div id="add-error" style="color:var(--copper); font-size:12px; margin-top:8px;"></div>
          </div>

          <h3 style="font-size:16px; margin-bottom:12px;">Manage Products</h3>
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>${escapeHtml(p.name)}</td>
                  <td>${escapeHtml(p.category)}</td>
                  <td class="mono">$${Number(p.price).toFixed(2)}</td>
                  <td><button class="del-btn" data-id="${escapeHtml(p.id)}">Remove</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById('save-commission').addEventListener('click', async () => {
      const v = parseFloat(document.getElementById('commission-input').value);
      if (!isNaN(v)) { commissionRate = v; await saveSettings(); renderAdmin(); }
    });

    document.getElementById('add-product-btn').addEventListener('click', async () => {
      const name = document.getElementById('f-name').value.trim();
      const category = document.getElementById('f-category').value.trim();
      const price = parseFloat(document.getElementById('f-price').value);
      const tags = document.getElementById('f-tags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const image = document.getElementById('f-image').value.trim() || 'https://placehold.co/400x260/2E3439/C9A24B?text=Product';
      const link = document.getElementById('f-link').value.trim();
      const description = document.getElementById('f-desc').value.trim();

      if (!name || !category || isNaN(price) || !link) {
        document.getElementById('add-error').textContent = 'Please fill in name, category, price, and affiliate link.';
        return;
      }
      const id = 'p' + Date.now();
      products.push({ id, name, category, tags, price, image, link, description });
      await saveProducts();
      renderAdmin();
    });

    viewAdmin.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        products = products.filter(p => p.id !== id);
        delete clicks[id];
        await saveProducts();
        await saveClicks();
        renderAdmin();
      });
    });
  }

  // Initialize data on load
  initData();
})();