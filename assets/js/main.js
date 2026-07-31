/* ============================================================================
   Portfolio behaviour — vanilla ES2020, zero dependencies.

   Conventions
   - Every animation checks prefers-reduced-motion first.
   - Anything that can fail (observers, fetch, rAF) has a failsafe so content
     is never left invisible or stuck in a loading state.
   - Nothing here requires a backend, a token, or a secret.
   ========================================================================= */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HAS_IO  = 'IntersectionObserver' in window;

  /* ─────────────────────────────────────────────── theme ── */
  const KEY = 'kj-theme';
  const root = document.documentElement;
  const SUN = '<circle cx="10" cy="10" r="4"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M4 4l1.4 1.4M14.6 14.6 16 16M16 4l-1.4 1.4M5.4 14.6 4 16" stroke-linecap="round"/>';
  const MOON = '<path d="M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5z" stroke-linejoin="round"/>';

  function setTheme(t) {
    root.dataset.theme = t;
    const btn = $('#themeBtn'), icon = $('#themeIcon');
    if (btn) {
      btn.setAttribute('aria-pressed', String(t === 'dark'));
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    if (icon) icon.innerHTML = t === 'dark' ? MOON : SUN;
  }
  setTheme(localStorage.getItem(KEY)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  $('#themeBtn')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    setTheme(next);
  });

  const yr = $('#yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ──────────────────────────────── scroll progress + nav ── */
  const bar = $('#bar'), nav = $('#nav');
  let queued = false;
  function onScroll() {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    if (bar) bar.style.width = (max > 0 ? (el.scrollTop / max) * 100 : 0) + '%';
    if (nav) nav.dataset.stuck = String(el.scrollTop > 4);
    queued = false;
  }
  addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ────────────────────────────────────────── mobile menu ── */
  const burger = $('#burger'), drawer = $('#drawer');
  burger?.addEventListener('click', () => {
    const open = drawer.dataset.open !== 'true';
    drawer.dataset.open = String(open);
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#drawer a').forEach(a => a.addEventListener('click', () => {
    drawer.dataset.open = 'false';
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* ───────────────────────────────────────────────── reveal ── */
  function showAll(scope = document) {
    $$('[data-reveal]:not([data-shown])', scope).forEach(el => { el.dataset.shown = 'true'; });
  }
  if (REDUCED || !HAS_IO) {
    showAll();
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = `${Math.min(i, 4) * 60}ms`;
        e.target.dataset.shown = 'true';
        io.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
    setTimeout(() => showAll(), 2500);           // failsafe
  }
  addEventListener('beforeprint', () => showAll());

  /* ─────────────────────────────────────────────── scrollspy ── */
  const links = $$('.nav__links a');
  if (HAS_IO && links.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.removeAttribute('aria-current'));
        $(`.nav__links a[href="#${e.target.id}"]`)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(s => spy.observe(s));
  }

  /* ────────────────────────────────────────── role rotator ── */
  const ROLES = ['AI/ML Engineer', 'Data Scientist', 'LLM Engineer', 'Computer Vision Enthusiast'];
  const rot = $('#rot');
  if (rot) {
    if (REDUCED) {
      rot.textContent = ROLES[0];
    } else {
      let i = 0, n = 0, del = false;
      (function tick() {
        const w = ROLES[i];
        n += del ? -1 : 1;
        rot.textContent = w.slice(0, n);
        let wait = del ? 34 : 72;
        if (!del && n === w.length) { wait = 1800; del = true; }
        else if (del && n === 0) { del = false; i = (i + 1) % ROLES.length; wait = 240; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ────────────────────────────────────────────── counters ── */
  const nf = new Intl.NumberFormat('en-US');
  if (HAS_IO) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        cio.unobserve(el);
        const target = Number(el.dataset.count || 0);
        const suffix = el.dataset.suffix || '';
        const done = nf.format(target) + suffix;
        if (REDUCED) { el.textContent = done; return; }
        const guard = setTimeout(() => { el.textContent = done; }, 2200);
        const DUR = 1100, t0 = performance.now();
        (function step(now) {
          const p = Math.min((now - t0) / DUR, 1);
          el.textContent = nf.format(Math.round(target * (1 - Math.pow(1 - p, 3)))) + suffix;
          if (p < 1) requestAnimationFrame(step); else clearTimeout(guard);
        })(t0);
      });
    }, { threshold: 0.35 });
    $$('[data-count]').forEach(el => cio.observe(el));
  } else {
    $$('[data-count]').forEach(el => {
      el.textContent = nf.format(Number(el.dataset.count || 0)) + (el.dataset.suffix || '');
    });
  }

  /* ────────────────────────────────────── deep-dive toggles ── */
  $$('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.dataset.toggle);
      if (!panel) return;
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide deep dive' : 'Engineering deep dive';
    });
  });

  /* ──────────────────────────────────────── project filter ── */
  $$('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      $$('#projects .project').forEach(card => {
        card.hidden = !(f === 'all' || (card.dataset.tags || '').split(' ').includes(f));
      });
    });
  });

  /* ─────────────────────────────────────────────── skills ── */
  const SKILLS = [
    { cat: 'prog', icon: 'Py', name: 'Programming', note: 'Languages used day to day',
      used: 'All three projects',
      items: ['Python', 'SQL', 'JavaScript', 'TypeScript', 'Java', 'R'] },
    { cat: 'ml', icon: 'ML', name: 'Machine Learning', note: 'Modelling, training, evaluation',
      used: 'Medical AI · SafeInbox · Genomic',
      items: ['Scikit-learn', 'PyTorch', 'Transformers', 'DenseNet121', 'Model Evaluation',
              'Feature Engineering', 'Classification', 'Clustering'] },
    { cat: 'ds', icon: 'DS', name: 'Data Science', note: 'Analysis, statistics, visualisation',
      used: 'Genomic clustering · QA analytics',
      items: ['Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'EDA', 'Statistics',
              'Dimensionality Reduction', 'Data Cleaning'] },
    { cat: 'llm', icon: 'AI', name: 'LLMs & Generative AI', note: 'Retrieval and grounding',
      used: 'Medical Multimodal AI Assistant',
      items: ['RAG', 'Prompt Engineering', 'Sentence Transformers', 'Embeddings',
              'ChromaDB', 'FAISS', 'LangChain', 'Hybrid Retrieval'] },
    { cat: 'be', icon: 'BE', name: 'Backend', note: 'Services and APIs',
      used: '10 endpoints on the medical service',
      items: ['FastAPI', 'Flask', 'REST API Design', 'Node.js', 'Express', 'Streamlit'] },
    { cat: 'fe', icon: 'FE', name: 'Frontend', note: 'Interfaces for ML systems',
      used: 'Medical dashboard · SafeInbox UI',
      items: ['React', 'TypeScript', 'HTML', 'CSS'] },
    { cat: 'db', icon: 'DB', name: 'Databases', note: 'Relational, document, vector',
      used: 'Persistence across both full-stack projects',
      items: ['MongoDB', 'MySQL', 'Vector Stores'] },
    { cat: 'ops', icon: 'Ops', name: 'DevOps & Tooling', note: 'Build, ship, keep running',
      used: 'Docker + Jenkins on SafeInbox',
      items: ['Docker', 'Jenkins', 'Git', 'GitHub', 'Linux', 'pytest', 'pre-commit'] },
    { cat: 'qa', icon: 'QA', name: 'QA & Analytics', note: 'From my QA engineering internship',
      used: 'NIIT Ltd, 2026',
      items: ['Selenium', 'Playwright', 'API Testing', 'Regression Testing',
              'SQL Validation', 'Root Cause Analysis', 'Postman', 'Power BI'] }
  ];

  const grid = $('#skillgrid');
  if (grid) {
    grid.innerHTML = SKILLS.map(g => `
      <article class="skill" data-cat="${g.cat}" data-reveal>
        <div class="skill__head">
          <span class="skill__icon" aria-hidden="true">${g.icon}</span>
          <h3 class="h3" style="font-size:.9375rem">${g.name}</h3>
        </div>
        <p class="skill__note">${g.note}</p>
        <ul class="skill__items">${g.items.map(i => `<li data-t="${i.toLowerCase()}">${i}</li>`).join('')}</ul>
        <p class="skill__used">Used in: ${g.used}</p>
      </article>`).join('');

    if (REDUCED || !HAS_IO) showAll(grid);
    else {
      const sio = new IntersectionObserver((es) => {
        es.forEach((e, i) => {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = `${Math.min(i, 5) * 50}ms`;
          e.target.dataset.shown = 'true';
          sio.unobserve(e.target);
        });
      }, { threshold: 0.08 });
      $$('.skill', grid).forEach(c => sio.observe(c));
      setTimeout(() => showAll(grid), 2500);
    }

    let cat = 'all';
    const q = $('#skq'), empty = $('#skempty');

    function applySkills() {
      const term = (q?.value || '').trim().toLowerCase();
      let shown = 0;
      $$('.skill', grid).forEach(card => {
        const catOk = cat === 'all' || card.dataset.cat === cat;
        let hits = 0;
        $$('li', card).forEach(li => {
          const hit = Boolean(term) && li.dataset.t.includes(term);
          li.dataset.hit = String(hit);
          if (hit) hits++;
        });
        const vis = catOk && (!term || hits > 0);
        card.hidden = !vis;
        if (vis) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    }
    q?.addEventListener('input', applySkills);
    $$('[data-cat]').forEach(btn => btn.addEventListener('click', () => {
      cat = btn.dataset.cat;
      $$('[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      applySkills();
    }));
  }

  /* ───────────────────────────────── GitHub (public REST) ── */
  const LANG = {
    Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26',
    CSS: '#563d7c', 'Jupyter Notebook': '#DA5B0B', Java: '#b07219', R: '#198CE7',
    Go: '#00ADD8', Shell: '#89e051', Dockerfile: '#384d54'
  };
  const esc = s => String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  const repoBox = $('#repos');

  async function loadRepos() {
    const ctrl = new AbortController();
    const bail = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(
        'https://api.github.com/users/karthikjonnalagadda/repos?sort=updated&per_page=8',
        { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl.signal });
      if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
      const repos = (await res.json()).filter(r => !r.fork).slice(0, 6);
      if (!repos.length) throw new Error('no public repositories');

      repoBox.innerHTML = repos.map(r => `
        <a class="repo" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">
          <p class="repo__name">${esc(r.name)}</p>
          <p class="repo__desc">${esc(r.description || 'No description provided.')}</p>
          <div class="repo__meta">
            ${r.language ? `<span><i class="dot" style="background:${LANG[r.language] || '#8b949e'}"></i>${esc(r.language)}</span>` : ''}
            <span>★ ${r.stargazers_count}</span>
            <span>⑂ ${r.forks_count}</span>
            <span>${new Date(r.updated_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
          </div>
        </a>`).join('');
      renderLangMix(repos);
    } catch (err) {
      const why = err.name === 'AbortError' ? 'the request timed out' : err.message;
      repoBox.innerHTML = `<p class="small">Repositories couldn't be loaded (${esc(why)}).
        <a href="https://github.com/karthikjonnalagadda" target="_blank" rel="noopener noreferrer"
           style="color:var(--accent)">Browse them on GitHub →</a></p>`;
    } finally {
      clearTimeout(bail);
      repoBox.setAttribute('aria-busy', 'false');
    }
  }

  /* Language mix from the repo payload already in hand. A contribution graph
     would need authenticated GraphQL, which cannot ship safely on Pages. */
  function renderLangMix(repos) {
    const host = $('#langmix');
    if (!host) return;
    const tally = {};
    repos.forEach(r => { if (r.language) tally[r.language] = (tally[r.language] || 0) + 1; });
    const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return;
    const total = rows.reduce((s, [, n]) => s + n, 0);
    host.innerHTML = `
      <p class="eyebrow">Language mix across public repositories</p>
      <div class="langbar" role="img" aria-label="${rows.map(([l, n]) =>
        `${l} ${Math.round(n / total * 100)} percent`).join(', ')}">
        ${rows.map(([l, n]) => `<span style="width:${(n / total * 100).toFixed(1)}%;background:${LANG[l] || '#8b949e'}"></span>`).join('')}
      </div>
      <ul class="langlegend">${rows.map(([l, n]) =>
        `<li><i class="dot" style="background:${LANG[l] || '#8b949e'}"></i>${esc(l)} <b>${Math.round(n / total * 100)}%</b></li>`).join('')}</ul>`;
    host.hidden = false;
  }

  if (repoBox) {
    if (HAS_IO) {
      const gio = new IntersectionObserver((es) => {
        if (es.some(e => e.isIntersecting)) { gio.disconnect(); loadRepos(); }
      }, { rootMargin: '300px' });
      gio.observe(repoBox);
    } else { loadRepos(); }
  }

  /* ───────────────────────────────────────── résumé preview ── */
  $('#pdfLoad')?.addEventListener('click', () => {
    const host = $('#pdfbox');
    if (!host) return;
    host.innerHTML = `<object data="assets/Karthik_Jonnalagadda_Resume.pdf#view=FitH"
        type="application/pdf" aria-label="Résumé preview">
        <p class="small" style="padding:var(--s5)">This browser can't display PDFs inline.
        <a href="assets/Karthik_Jonnalagadda_Resume.pdf" download style="color:var(--accent)">Download it →</a></p>
      </object>`;
  });
  $('#printBtn')?.addEventListener('click', () => {
    open('assets/Karthik_Jonnalagadda_Resume.pdf', '_blank', 'noopener');
  });

  /* ─────────────────────────────────────────────── clipboard ── */
  const toast = $('#toast');
  let tt;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => { toast.dataset.on = 'true'; });
    clearTimeout(tt);
    tt = setTimeout(() => {
      toast.dataset.on = 'false';
      setTimeout(() => { toast.hidden = true; }, 240);
    }, 1800);
  }
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say('Copied'); }
    catch { say('Copy failed — select the text manually'); }
  }));

  /* ──────────────────────────────────────── command palette ── */
  const go = sel => $(sel)?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  const CMDS = [
    { label: 'Work',      hint: 'section', run: () => go('#work') },
    { label: 'Skills',    hint: 'section', run: () => go('#skills') },
    { label: 'Timeline',  hint: 'section', run: () => go('#timeline') },
    { label: 'GitHub',    hint: 'section', run: () => go('#github') },
    { label: 'Résumé',    hint: 'section', run: () => go('#resume') },
    { label: 'Contact',   hint: 'section', run: () => go('#contact') },
    { label: 'Download résumé (PDF)', hint: 'action', run: () => { location.href = 'assets/Karthik_Jonnalagadda_Resume.pdf'; } },
    { label: 'Open GitHub profile',   hint: 'link',   run: () => open('https://github.com/karthikjonnalagadda', '_blank', 'noopener') },
    { label: 'Open LinkedIn',         hint: 'link',   run: () => open('https://www.linkedin.com/in/jonnalagadda-karthik01/', '_blank', 'noopener') },
    { label: 'Email Karthik',         hint: 'action', run: () => { location.href = 'mailto:jonnalagadda.karthik22@st.niituniversity.in'; } },
    { label: 'Toggle theme',          hint: 'action', run: () => $('#themeBtn').click() }
  ];

  /* Static content index — built on first open so it never costs page load. */
  let indexed = false;
  function buildIndex() {
    if (indexed) return;
    indexed = true;
    $$('#projects .project').forEach(card => {
      const title = $('.project__title', card)?.textContent.trim();
      if (!title) return;
      CMDS.push({ label: title, hint: 'project', run: () => card.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }) });
      $$('.stack li', card).forEach(li => CMDS.push({
        label: `${li.textContent.trim()} · ${title}`, hint: 'tech',
        run: () => card.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' })
      }));
    });
    $$('.skill').forEach(sc => {
      const group = $('h3', sc)?.textContent.trim() || 'Skills';
      $$('li', sc).forEach(li => CMDS.push({
        label: `${li.textContent.trim()} · ${group}`, hint: 'skill',
        run: () => {
          go('#skills');
          const q = $('#skq');
          if (q) { q.value = li.textContent.trim(); q.dispatchEvent(new Event('input')); }
        }
      }));
    });
  }

  const pal = $('#palette'), palq = $('#palq'), pallist = $('#pallist');
  let shown = CMDS, cur = 0, prevFocus = null;

  function paint() {
    pallist.innerHTML = shown.slice(0, 40).map((c, i) =>
      `<li role="option" data-i="${i}" aria-selected="${i === cur}"><span>${esc(c.label)}</span><kbd>${c.hint}</kbd></li>`
    ).join('') || '<li aria-selected="false"><span>No matches</span></li>';
  }
  function openPal() {
    buildIndex();
    prevFocus = document.activeElement;
    pal.hidden = false;
    palq.value = ''; shown = CMDS; cur = 0;
    paint(); palq.focus();
  }
  function closePal() { pal.hidden = true; prevFocus?.focus(); }
  function run(i) { const c = shown[i]; if (!c) return; closePal(); c.run(); }

  $('#palBtn')?.addEventListener('click', openPal);
  palq?.addEventListener('input', () => {
    const t = palq.value.toLowerCase();
    shown = CMDS.filter(c => c.label.toLowerCase().includes(t));
    cur = 0; paint();
  });
  pallist?.addEventListener('click', e => {
    const li = e.target.closest('li[data-i]');
    if (li) run(Number(li.dataset.i));
  });
  pal?.addEventListener('click', e => { if (e.target === pal) closePal(); });

  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      pal.hidden ? openPal() : closePal();
      return;
    }
    if (pal.hidden) return;
    const max = Math.min(shown.length, 40) - 1;
    if (e.key === 'Escape')         { e.preventDefault(); closePal(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); cur = Math.min(cur + 1, max); paint(); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); cur = Math.max(cur - 1, 0); paint(); }
    else if (e.key === 'Enter')     { e.preventDefault(); run(cur); }
  });
})();
