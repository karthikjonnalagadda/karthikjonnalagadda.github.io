/* =============================================================
   Portfolio behaviour — vanilla ES2020, no dependencies.
   Every animation checks prefers-reduced-motion before running.
   ============================================================= */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  const THEME_KEY = 'kj-theme';
  const root = document.documentElement;

  function applyTheme(t) {
    root.dataset.theme = t;
    const btn = $('#themeBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(t === 'light'));
      $('#themeIcon').textContent = t === 'light' ? '☀' : '◐';
    }
  }
  applyTheme(localStorage.getItem(THEME_KEY)
    || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  $('#themeBtn')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  /* ---------- year ---------- */
  const y = $('#year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---------- scroll progress + sticky nav ---------- */
  const bar = $('#scrollBar');
  const nav = $('#nav');
  let ticking = false;

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    if (nav) nav.classList.toggle('is-stuck', h.scrollTop > 8);
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- mobile nav ---------- */
  const burger = $('#burger');
  const mobile = $('#mobileNav');
  burger?.addEventListener('click', () => {
    const open = mobile.classList.toggle('is-open');
    mobile.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#mobileNav a').forEach(a => a.addEventListener('click', () => {
    mobile.classList.remove('is-open');
    mobile.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- reveal on scroll ----------
     Failsafe: anything still hidden after 2.5s is forced visible, so a stalled
     observer or an unsupported browser can never leave the page blank. */
  function revealAllPending(root = document) {
    $$('.reveal:not(.is-in)', root).forEach(el => {
      el.style.transitionDelay = '0ms';
      el.classList.add('is-in');
    });
  }

  const revealables = $$('.reveal');
  if (REDUCED || !('IntersectionObserver' in window)) {
    revealAllPending();
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(el => io.observe(el));
    setTimeout(() => revealAllPending(), 2500);
  }
  addEventListener('beforeprint', () => revealAllPending());

  /* ---------- scroll-spy ---------- */
  const navLinks = $$('.nav__links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.remove('is-active'));
      $(`.nav__links a[href="#${e.target.id}"]`)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* ---------- typing headline ---------- */
  const ROLES = ['AI/ML Engineer', 'Data Scientist', 'LLM Engineer', 'Computer Vision Enthusiast'];
  const typed = $('#typed');
  if (typed) {
    if (REDUCED) {
      typed.textContent = ROLES[0];
    } else {
      let r = 0, c = 0, deleting = false;
      (function tick() {
        const word = ROLES[r];
        c += deleting ? -1 : 1;
        typed.textContent = word.slice(0, c);
        let wait = deleting ? 40 : 78;
        if (!deleting && c === word.length) { wait = 1700; deleting = true; }
        else if (deleting && c === 0) { deleting = false; r = (r + 1) % ROLES.length; wait = 260; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ---------- animated counters ---------- */
  const fmt = new Intl.NumberFormat('en-US');
  const counters = $$('.stat__n');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      cio.unobserve(el);
      const target = Number(el.dataset.count || 0);
      const suffix = el.dataset.suffix || '';
      const final = fmt.format(target) + suffix;
      if (REDUCED) { el.textContent = final; return; }
      // Failsafe: if rAF is throttled (background tab, power saving) the real
      // number still lands rather than leaving a permanent 0 on screen.
      const guard = setTimeout(() => { el.textContent = final; }, 2200);
      const DUR = 1400, t0 = performance.now();
      (function step(now) {
        const p = Math.min((now - t0) / DUR, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt.format(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else clearTimeout(guard);
      })(t0);
    });
  }, { threshold: 0.4 });
  counters.forEach(c => cio.observe(c));

  /* ---------- expandable project details ---------- */
  $$('.js-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide details' : 'Technical details';
    });
  });

  /* ---------- project filter ---------- */
  $$('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      $$('[data-filter]').forEach(b => {
        const on = b === btn;
        b.classList.toggle('chip--on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      $$('#cards .card').forEach(card => {
        const show = f === 'all' || (card.dataset.tags || '').split(' ').includes(f);
        card.hidden = !show;
      });
    });
  });

  /* ---------- card mouse-follow sheen ---------- */
  if (!REDUCED && matchMedia('(pointer: fine)').matches) {
    $$('.card').forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- skills ---------- */
  const SKILLS = [
    { cat: 'prog', name: 'Programming',  note: 'Languages I write daily',
      items: ['Python', 'SQL', 'JavaScript', 'TypeScript', 'Java', 'R'] },
    { cat: 'aiml', name: 'AI / Machine Learning', note: 'Modelling and evaluation',
      items: ['Scikit-learn', 'PyTorch', 'Transformers', 'Neural Networks', 'DenseNet121',
              'Computer Vision', 'NLP', 'OCR', 'Model Evaluation', 'Feature Engineering'] },
    { cat: 'ds', name: 'Data Science', note: 'Analysis and statistics',
      items: ['Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'EDA', 'Statistics',
              'Clustering', 'Dimensionality Reduction', 'Data Cleaning'] },
    { cat: 'llm', name: 'LLMs & Generative AI', note: 'Retrieval and grounding',
      items: ['RAG', 'Prompt Engineering', 'Sentence Transformers', 'Embeddings',
              'ChromaDB', 'FAISS', 'LangChain', 'Hybrid Retrieval'] },
    { cat: 'be', name: 'Backend', note: 'Services and APIs',
      items: ['FastAPI', 'Flask', 'REST API Design', 'Node.js', 'Express', 'Streamlit'] },
    { cat: 'fe', name: 'Frontend', note: 'Interfaces for ML systems',
      items: ['React', 'TypeScript', 'HTML', 'CSS'] },
    { cat: 'db', name: 'Databases', note: 'Relational, document, vector',
      items: ['MongoDB', 'MySQL', 'Vector Stores'] },
    { cat: 'ops', name: 'DevOps & Tooling', note: 'Ship and keep it running',
      items: ['Docker', 'Jenkins', 'Git', 'GitHub', 'Linux', 'pytest', 'pre-commit'] },
    { cat: 'qa', name: 'QA & Analytics', note: 'From my QA engineering work',
      items: ['Selenium', 'Playwright', 'API Testing', 'Regression Testing',
              'SQL Validation', 'Root Cause Analysis', 'Postman', 'Power BI'] }
  ];

  const grid = $('#skills-grid');
  if (grid) {
    grid.innerHTML = SKILLS.map(g => `
      <article class="skillcard reveal" data-cat="${g.cat}">
        <h3>${g.name}</h3>
        <p>${g.note}</p>
        <ul>${g.items.map(i => `<li data-skill-name="${i.toLowerCase()}">${i}</li>`).join('')}</ul>
      </article>`).join('');

    if (REDUCED || !('IntersectionObserver' in window)) {
      $$('.skillcard').forEach(c => c.classList.add('is-in'));
    } else {
      const sio = new IntersectionObserver((es) => {
        es.forEach((e, i) => {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = `${Math.min(i, 6) * 60}ms`;
          e.target.classList.add('is-in');
          sio.unobserve(e.target);
        });
      }, { threshold: 0.1 });
      $$('.skillcard').forEach(c => sio.observe(c));
      setTimeout(() => revealAllPending($('#skills-grid')), 2500);
    }

    let activeCat = 'all';
    const search = $('#skillSearch');
    const empty = $('#skillEmpty');

    function applySkillFilter() {
      const q = (search?.value || '').trim().toLowerCase();
      let visible = 0;
      $$('.skillcard').forEach(card => {
        const catOk = activeCat === 'all' || card.dataset.cat === activeCat;
        let hits = 0;
        $$('li', card).forEach(li => {
          const hit = q && li.dataset.skillName.includes(q);
          li.classList.toggle('is-hit', Boolean(hit));
          if (hit) hits++;
        });
        const show = catOk && (!q || hits > 0);
        card.hidden = !show;
        if (show) visible++;
      });
      if (empty) empty.hidden = visible !== 0;
    }

    search?.addEventListener('input', applySkillFilter);
    $$('[data-skill]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCat = btn.dataset.skill;
        $$('[data-skill]').forEach(b => {
          const on = b === btn;
          b.classList.toggle('chip--on', on);
          b.setAttribute('aria-pressed', String(on));
        });
        applySkillFilter();
      });
    });
  }

  /* ---------- GitHub repositories ---------- */
  const LANG_COLOR = {
    Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26',
    CSS: '#563d7c', Jupyter: '#DA5B0B', 'Jupyter Notebook': '#DA5B0B', Java: '#b07219', R: '#198CE7'
  };
  const repoBox = $('#repos');

  async function loadRepos() {
    if (!repoBox) return;
    const ctrl = new AbortController();
    const bail = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(
        'https://api.github.com/users/karthikjonnalagadda/repos?sort=updated&per_page=6',
        { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl.signal });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const repos = (await res.json()).filter(r => !r.fork);
      if (!repos.length) throw new Error('no repositories returned');

      repoBox.innerHTML = repos.map(r => `
        <a class="repo" href="${r.html_url}" target="_blank" rel="noopener noreferrer">
          <div class="repo__name">${escapeHtml(r.name)}</div>
          <p class="repo__desc">${escapeHtml(r.description || 'No description provided.')}</p>
          <div class="repo__meta">
            ${r.language ? `<span><i class="dot" style="background:${LANG_COLOR[r.language] || '#8b949e'}"></i>${escapeHtml(r.language)}</span>` : ''}
            <span>★ ${r.stargazers_count}</span>
            <span>Updated ${new Date(r.updated_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
          </div>
        </a>`).join('');

      renderLanguageMix(repos);
    } catch (err) {
      const why = err.name === 'AbortError' ? 'request timed out' : err.message;
      repoBox.innerHTML =
        `<p class="footnote">Couldn't load repositories right now (${escapeHtml(why)}).
         <a href="https://github.com/karthikjonnalagadda" target="_blank" rel="noopener noreferrer">Browse them on GitHub ↗</a></p>`;
    } finally {
      clearTimeout(bail);
      repoBox.setAttribute('aria-busy', 'false');
    }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  /* Language mix, derived from the public repo list already fetched.
     Static replacement for a contribution graph — that needs an authenticated
     GraphQL token, which cannot be shipped safely on GitHub Pages. */
  function renderLanguageMix(repos) {
    const host = $('#langMix');
    if (!host) return;
    const counts = {};
    repos.forEach(r => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) { host.hidden = true; return; }
    const total = entries.reduce((s, [, n]) => s + n, 0);

    host.innerHTML = `
      <p class="eyebrow">Language mix across public repositories</p>
      <div class="langbar" role="img" aria-label="${entries.map(([l, n]) =>
        `${l} ${Math.round(n / total * 100)} percent`).join(', ')}">
        ${entries.map(([l, n]) =>
          `<span style="width:${(n / total * 100).toFixed(1)}%;background:${LANG_COLOR[l] || '#8b949e'}"></span>`).join('')}
      </div>
      <ul class="langlegend">
        ${entries.map(([l, n]) =>
          `<li><i class="dot" style="background:${LANG_COLOR[l] || '#8b949e'}"></i>${escapeHtml(l)}
           <b>${Math.round(n / total * 100)}%</b></li>`).join('')}
      </ul>`;
    host.hidden = false;
  }
  if (repoBox) {
    const gio = new IntersectionObserver((es) => {
      if (es.some(e => e.isIntersecting)) { gio.disconnect(); loadRepos(); }
    }, { rootMargin: '260px' });
    gio.observe(repoBox);
  }

  /* ---------- copy to clipboard ---------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-on');
      setTimeout(() => { toast.hidden = true; }, 260);
    }, 1900);
  }
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast('Copied to clipboard');
      } catch {
        showToast('Copy failed — select and copy manually');
      }
    });
  });

  /* ---------- résumé preview (loaded on demand) ----------
     Embedding the PDF up-front costs every visitor a download and disqualifies
     the page from the back/forward cache, so it is injected only when asked. */
  $('#resumeLoad')?.addEventListener('click', () => {
    const host = $('#resumeView');
    if (!host) return;
    host.innerHTML =
      `<object data="assets/Karthik_Jonnalagadda_Resume.pdf#view=FitH" type="application/pdf" aria-label="Résumé preview">
         <p class="footnote">Your browser can't display PDFs inline.
         <a href="assets/Karthik_Jonnalagadda_Resume.pdf" download>Download it instead</a>.</p>
       </object>`;
  });

  /* ---------- magnetic buttons ----------
     Rect is measured once on enter, not per pointermove, to avoid layout
     thrash on every mouse event. */
  if (!REDUCED && matchMedia('(pointer: fine)').matches) {
    $$('.magnetic').forEach(el => {
      let rect = null;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (e) => {
        if (!rect) return;
        const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.16;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.28;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; rect = null; });
    });
  }

  /* ---------- cursor glow ---------- */
  const glow = $('#cursorGlow');
  if (glow && !REDUCED && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      glow.style.opacity = '1';
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, { passive: true });
    addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
  }

  /* ---------- particle field ---------- */
  const cv = $('#particles');
  if (cv && !REDUCED && matchMedia('(pointer: fine)').matches) {
    const ctx = cv.getContext('2d', { alpha: true });
    let parts = [], raf = 0, w = 0, h = 0;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.width = innerWidth * dpr;
      h = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
      const count = Math.min(46, Math.round(innerWidth / 34));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .22 * dpr, vy: (Math.random() - .5) * .22 * dpr,
        r: (Math.random() * 1.5 + .6) * dpr
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const accent = getComputedStyle(root).getPropertyValue('--a1').trim() || '#6ea8fe';
      ctx.fillStyle = accent;
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.globalAlpha = .34;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); draw(); }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
    });
  }

  /* ---------- command palette ---------- */
  const COMMANDS = [
    { label: 'Projects',            hint: 'section', go: () => jump('#projects') },
    { label: 'Skills',              hint: 'section', go: () => jump('#skills') },
    { label: 'Journey & education', hint: 'section', go: () => jump('#journey') },
    { label: 'Open source',         hint: 'section', go: () => jump('#opensource') },
    { label: 'Résumé',              hint: 'section', go: () => jump('#resume') },
    { label: 'Contact',             hint: 'section', go: () => jump('#contact') },
    { label: 'Download résumé (PDF)', hint: 'action', go: () => { location.href = 'assets/Karthik_Jonnalagadda_Resume.pdf'; } },
    { label: 'Open GitHub',         hint: 'link', go: () => open('https://github.com/karthikjonnalagadda', '_blank', 'noopener') },
    { label: 'Open LinkedIn',       hint: 'link', go: () => open('https://www.linkedin.com/in/jonnalagadda-karthik01/', '_blank', 'noopener') },
    { label: 'Email Karthik',       hint: 'action', go: () => { location.href = 'mailto:jonnalagadda.karthik22@st.niituniversity.in'; } },
    { label: 'Toggle theme',        hint: 'action', go: () => $('#themeBtn').click() }
  ];

  /* Static content index — answers "where is X on this site?" without any
     model, backend or API key. Built from the DOM at load time. */
  function buildContentIndex() {
    const idx = [];
    $$('#cards .card').forEach(card => {
      const title = $('.card__title', card)?.textContent.trim();
      if (!title) return;
      idx.push({ label: title, hint: 'project', go: () => { card.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); } });
      $$('.stack li', card).forEach(li => {
        const tech = li.textContent.trim();
        idx.push({
          label: `${tech} — used in ${title}`, hint: 'tech',
          go: () => card.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' })
        });
      });
    });
    $$('.skillcard').forEach(sc => {
      const group = $('h3', sc)?.textContent.trim() || 'Skills';
      $$('li', sc).forEach(li => {
        idx.push({
          label: `${li.textContent.trim()} — ${group}`, hint: 'skill',
          go: () => {
            $('#skills')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
            const s = $('#skillSearch');
            if (s) { s.value = li.textContent.trim(); s.dispatchEvent(new Event('input')); }
          }
        });
      });
    });
    return idx;
  }
  // Built on first palette open, never during page load.
  let indexBuilt = false;
  function ensureIndex() {
    if (indexBuilt) return;
    indexBuilt = true;
    COMMANDS.push(...buildContentIndex());
  }

  const pal = $('#palette'), palInput = $('#paletteInput'), palList = $('#paletteList');
  let palIdx = 0, palShown = COMMANDS, lastFocus = null;

  function jump(sel) { $(sel)?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); }

  function renderPal() {
    palList.innerHTML = palShown.map((c, i) =>
      `<li role="option" data-i="${i}" aria-selected="${i === palIdx}">
         <span>${c.label}</span><kbd>${c.hint}</kbd></li>`).join('');
  }
  function openPal() {
    ensureIndex();
    lastFocus = document.activeElement;
    pal.hidden = false;
    palInput.value = '';
    palShown = COMMANDS; palIdx = 0;
    renderPal();
    palInput.focus();
  }
  function closePal() {
    pal.hidden = true;
    lastFocus?.focus();
  }
  function runPal(i) {
    const cmd = palShown[i];
    if (!cmd) return;
    closePal();
    cmd.go();
  }

  $('#paletteBtn')?.addEventListener('click', openPal);
  palInput?.addEventListener('input', () => {
    const q = palInput.value.toLowerCase();
    palShown = COMMANDS.filter(c => c.label.toLowerCase().includes(q));
    palIdx = 0;
    renderPal();
  });
  palList?.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) runPal(Number(li.dataset.i));
  });
  pal?.addEventListener('click', (e) => { if (e.target === pal) closePal(); });

  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      pal.hidden ? openPal() : closePal();
      return;
    }
    if (pal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closePal(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palIdx + 1, palShown.length - 1); renderPal(); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); palIdx = Math.max(palIdx - 1, 0); renderPal(); }
    else if (e.key === 'Enter')     { e.preventDefault(); runPal(palIdx); }
  });
})();
