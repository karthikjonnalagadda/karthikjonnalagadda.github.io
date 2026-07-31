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

  /* ═══════════════════════════ SHOWCASE (public GitHub REST only) ═══════════
     Metadata is live. Summaries and engineering highlights are curated from
     each project's README — never generated from the repo name, and never
     invented. Repos without a verified summary fall back to a neutral line. */

  const LANG = {
    Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26',
    CSS: '#563d7c', 'Jupyter Notebook': '#DA5B0B', Java: '#b07219', R: '#198CE7',
    Go: '#00ADD8', Shell: '#89e051', Dockerfile: '#384d54'
  };
  const esc = s => String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  /* name → verified profile, sourced from that repository's README */
  const PROFILE = {
    'medical_multimodal_rag_ai': {
      title: 'Medical Multimodal AI Assistant', badge: 'Flagship', tone: 'flag', feat: 1,
      value: 'Reads lab reports with OCR, analyses chest X-rays with a CNN, and answers clinical questions through retrieval-augmented generation — grounded in retrieved evidence rather than model memory.',
      hl: [['10', 'REST APIs'], ['50', 'tests'], ['60%', 'coverage'], ['14', 'classes'], ['384', 'dim embeddings']],
      tech: ['Python', 'FastAPI', 'PyTorch', 'ChromaDB', 'FAISS', 'LangChain', 'EasyOCR', 'MongoDB', 'React']
    },
    'SAFEINBOX': {
      title: 'SafeInbox', badge: 'Production Ready', tone: 'prod', feat: 2,
      value: 'Real-time email spam detection over live Gmail and IMAP inboxes, serving a scikit-learn classifier from inside a Node runtime with no separate model service to operate.',
      hl: [['26,972', 'emails'], ['1.03M', 'features'], ['JWT', 'auth'], ['Docker', ''], ['Jenkins', 'CI']],
      tech: ['Python', 'Scikit-learn', 'Node.js', 'Express', 'React', 'MongoDB', 'Docker', 'Jenkins']
    },
    'Job-moniter': {
      title: 'AI Job Intelligence Agent', badge: 'Production Ready', tone: 'prod', feat: 3,
      value: 'Autonomous job discovery: collects postings from official career pages and ATS platforms, deduplicates them, filters by profile before ranking, scores survivors against a resume with semantic embeddings, and emails a daily report.',
      hl: [['MIT', 'licensed'], ['CI', 'on push'], ['mypy', 'typed'], ['ruff', 'linted']],
      tech: ['Python 3.12', 'Embeddings', 'GitHub Actions', 'mypy', 'ruff']
    },
    'mini-erp': {
      title: 'Mini ERP + CRM Portal', badge: 'Production Ready', tone: 'prod',
      value: 'ERP and CRM for a wholesale distribution business — product catalogue, real-time inventory on an append-only stock ledger, and sales challans with transactional stock deduction.',
      hl: [['RBAC', ''], ['Audit', 'trail'], ['Monorepo', '']],
      tech: ['TypeScript', 'Express', 'Prisma', 'PostgreSQL', 'React', 'Vite', 'Tailwind']
    },
    'Containerized-CLI-Login-System': {
      title: 'Containerized CLI Login System', badge: 'Production Ready', tone: 'prod',
      value: 'A command-line authentication service in Go: registration, password login with account lockout, TOTP two-factor, and server-side sessions. No web UI by design — a thin CLI over a testable service core.',
      hl: [['TOTP', '2FA'], ['Lockout', ''], ['Sessions', '']],
      tech: ['Go', 'Docker', 'TOTP']
    },
    'AI-Powered-Customer-Complaint-Management-System': {
      title: 'Customer Complaint AI', badge: 'Featured', tone: 'flag',
      value: 'Pharmaceutical complaint intake: upload a PDF, image or DOCX and a LangGraph workflow extracts the details, auto-fills the form, then classifies risk, checks completeness and detects duplicates.',
      hl: [['LangGraph', ''], ['Risk', 'scoring'], ['Dedupe', '']],
      tech: ['TypeScript', 'LangGraph', 'AI Workflow']
    },
    'SecondBrain-A-Local-Multi-Modal-Knowledge-Engine-MongoDB-FAISS-Local-LLM-': {
      title: 'SecondBrain Knowledge Engine', badge: 'Research', tone: '',
      value: 'A fully local multimodal knowledge engine that ingests PDFs, audio, images, URLs and text, stores structured chunks in MongoDB, and retrieves them through FAISS with a local LLM.',
      hl: [['Local', 'LLM'], ['FAISS', ''], ['Multimodal', '']],
      tech: ['Python', 'MongoDB', 'FAISS', 'Local LLM']
    },
    'credit-risk-scoring': {
      title: 'Credit Risk Scoring', badge: 'Experimental', tone: '',
      value: 'An end-to-end credit scoring scaffold: React front end, Django REST with JWT, a LightGBM scoring service with SHAP explanations, and PostgreSQL — orchestrated with Docker Compose.',
      hl: [['LightGBM', ''], ['SHAP', ''], ['JWT', '']],
      tech: ['Python', 'Django REST', 'LightGBM', 'SHAP', 'PostgreSQL', 'Docker']
    },
    'BatchMonitoring': {
      title: 'Batch Monitoring System', badge: 'Open Source', tone: '',
      value: 'Automated Python service that pulls batch data from the NIIT API, validates it, generates a CSV report and sends daily email alerts.',
      hl: [['Scheduled', ''], ['CSV', 'reports']],
      tech: ['Python', 'Email', 'CSV']
    },
    'ai-resume-analyzer': {
      title: 'AI Resume Analyzer', badge: 'Featured', tone: 'flag',
      value: 'A full-stack application that simulates an Applicant Tracking System, scoring resumes against a job description.',
      hl: [['ATS', 'scoring']], tech: ['TypeScript', 'Full-stack']
    },
    'multimodal-code-debug': {
      title: 'Multimodal Code Debug Assistant', badge: 'Research', tone: '',
      value: 'Analyses source code alongside error screenshots to detect bugs and explain root causes.',
      hl: [['Multimodal', '']], tech: ['TypeScript', 'Vision', 'LLM']
    }
  };
  const FALLBACK = 'Project details are available in the repository.';
  const SKIP = new Set(['karthikjonnalagadda.github.io', 'CV', 'Karthik', 'lost-and-found']);

  /* Deterministic cover art derived from the repo name, so a project always
     renders identical artwork. No external images, no extra network cost. */
  function cover(name, lang) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const hue = h % 360, c = LANG[lang] || '#8b949e';
    const initials = name.replace(/[^a-zA-Z]/g, ' ').trim().split(/\s+/)
      .slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'KJ';
    const id = 'g' + h.toString(36);
    return '<svg viewBox="0 0 400 200" aria-hidden="true" preserveAspectRatio="xMidYMid slice">'
      + '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="hsl(' + hue + ' 62% 58%)" stop-opacity=".26"/>'
      + '<stop offset="1" stop-color="hsl(' + ((hue + 58) % 360) + ' 62% 52%)" stop-opacity=".10"/>'
      + '</linearGradient><pattern id="p' + id + '" width="22" height="22" patternUnits="userSpaceOnUse">'
      + '<circle cx="1.2" cy="1.2" r="1.2" fill="currentColor" opacity=".16"/></pattern></defs>'
      + '<rect width="400" height="200" fill="url(#' + id + ')"/>'
      + '<rect width="400" height="200" fill="url(#p' + id + ')" style="color:' + c + '"/>'
      + '<text x="28" y="118" font-size="54" font-weight="700" letter-spacing="-2" '
      + 'font-family="ui-sans-serif,system-ui,sans-serif" fill="' + c + '" opacity=".92">' + esc(initials) + '</text>'
      + '<rect x="28" y="136" width="52" height="3" rx="1.5" fill="' + c + '" opacity=".55"/></svg>';
  }

  const kb = n => n > 1024 ? (n / 1024).toFixed(1) + ' MB' : n + ' KB';
  const when = d => new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  function card(r, featured) {
    const p = PROFILE[r.name] || {};
    const title = p.title || r.name.replace(/[-_]/g, ' ');
    const value = p.value || r.description || FALLBACK;
    const hl = p.hl || [];
    const tech = p.tech || (r.language ? [r.language] : []);
    const lic = (r.license || {}).spdx_id;
    const arrow = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<article class="pc" role="listitem" data-reveal>'
      + '<div class="pc__cover">'
      + (p.badge ? '<span class="pc__badge"' + (p.tone ? ' data-tone="' + p.tone + '"' : '') + '>' + esc(p.badge) + '</span>' : '')
      + cover(r.name, r.language) + '</div>'
      + '<div class="pc__body">'
      + '<h4 class="pc__title">' + esc(title) + '</h4>'
      + '<p class="pc__value">' + esc(value) + '</p>'
      + (hl.length ? '<div class="pc__hl">' + hl.map(function (x) {
          return '<span class="hl"><b>' + esc(x[0]) + '</b>' + (x[1] ? esc(x[1]) : '') + '</span>';
        }).join('') + '</div>' : '')
      + (tech.length ? '<ul class="pc__tech">' + tech.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '')
      + '<dl class="pc__facts">'
      + (r.language ? '<div class="fact"><dt>Language</dt><dd>' + esc(r.language) + '</dd></div>' : '')
      + '<div class="fact"><dt>Size</dt><dd>' + kb(r.size) + '</dd></div>'
      + '<div class="fact"><dt>Updated</dt><dd>' + when(r.updated_at) + '</dd></div>'
      + (lic && lic !== 'NOASSERTION' ? '<div class="fact"><dt>License</dt><dd>' + esc(lic) + '</dd></div>' : '')
      + '</dl>'
      + '<div class="pc__actions">'
      + '<a class="btn btn--sm ' + (featured ? 'btn--primary' : '') + '" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">Source code' + arrow + '</a>'
      + '<a class="btn btn--sm" href="' + esc(r.html_url) + '#readme" target="_blank" rel="noopener noreferrer">Documentation</a>'
      + (r.homepage ? '<a class="btn btn--sm" href="' + esc(r.homepage) + '" target="_blank" rel="noopener noreferrer">Live demo</a>' : '')
      + '</div></div></article>';
  }

  const skeleton = n => Array.from({ length: n }, function () {
    return '<div class="sk" role="listitem"><div class="sk__c shimmer"></div><div class="sk__b">'
      + '<div class="sk__l shimmer"></div><div class="sk__l shimmer"></div><div class="sk__l shimmer"></div>'
      + '</div></div>';
  }).join('');

  const featBox = $('#featured'), moreBox = $('#more');

  async function loadRepos() {
    if (!featBox || !moreBox) return;
    featBox.innerHTML = skeleton(3);
    moreBox.innerHTML = skeleton(6);
    const ctrl = new AbortController();
    const bail = setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch(
        'https://api.github.com/users/karthikjonnalagadda/repos?sort=updated&per_page=100',
        { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl.signal });
      if (!res.ok) throw new Error('GitHub API returned ' + res.status);
      const all = (await res.json()).filter(r => !r.fork && !SKIP.has(r.name));
      if (!all.length) throw new Error('no public repositories');

      const feat = all.filter(r => PROFILE[r.name] && PROFILE[r.name].feat)
                      .sort((a, b) => PROFILE[a.name].feat - PROFILE[b.name].feat);
      const rest = all.filter(r => !(PROFILE[r.name] && PROFILE[r.name].feat)).slice(0, 6);

      featBox.innerHTML = feat.map(r => card(r, true)).join('');
      moreBox.innerHTML = rest.map(r => card(r, false)).join('');
      showAll(featBox); showAll(moreBox);
      renderLangs(all);
    } catch (err) {
      const why = err.name === 'AbortError' ? 'the request timed out' : err.message;
      featBox.innerHTML = '<p class="small">Live repository data is unavailable right now ('
        + esc(why) + '). <a href="https://github.com/karthikjonnalagadda" target="_blank" '
        + 'rel="noopener noreferrer" style="color:var(--accent)">Browse the repositories on GitHub →</a></p>';
      moreBox.innerHTML = '';
    } finally {
      clearTimeout(bail);
      featBox.setAttribute('aria-busy', 'false');
      moreBox.setAttribute('aria-busy', 'false');
    }
  }

  /* Donut. A contribution graph would need authenticated GraphQL, which cannot
     ship safely on Pages; this uses the payload already in hand. */
  function renderLangs(repos) {
    const host = $('#langmix');
    if (!host) return;
    const tally = {};
    repos.forEach(r => { if (r.language) tally[r.language] = (tally[r.language] || 0) + 1; });
    const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return;
    const total = rows.reduce((s, x) => s + x[1], 0);
    const R = 68, C = 2 * Math.PI * R;
    let off = 0;

    const arcs = rows.map(function (row, i) {
      const frac = row[1] / total;
      const seg = '<circle r="' + R + '" cx="88" cy="88" stroke="' + (LANG[row[0]] || '#8b949e') + '" '
        + 'stroke-dasharray="' + (frac * C).toFixed(2) + ' ' + (C - frac * C).toFixed(2) + '" '
        + 'stroke-dashoffset="' + (-off).toFixed(2) + '" data-i="' + i + '" tabindex="0" role="img" '
        + 'aria-label="' + esc(row[0]) + ', ' + Math.round(frac * 100) + ' percent, ' + row[1]
        + (row[1] === 1 ? ' repository' : ' repositories') + '"></circle>';
      off += frac * C;
      return seg;
    }).join('');

    host.innerHTML = '<div class="donut" id="donut">'
      + '<svg viewBox="0 0 176 176" role="group" aria-label="Language distribution across '
      + total + ' repositories">' + arcs + '</svg>'
      + '<div class="donut__mid"><span class="donut__n" id="dn">' + total + '</span>'
      + '<span class="donut__k" id="dk">repositories</span></div></div>'
      + '<div><p class="eyebrow" style="margin-bottom:var(--s3)">Language distribution</p>'
      + '<ul class="langlist" id="langlist">' + rows.map(function (row, i) {
          return '<li data-i="' + i + '" tabindex="0">'
            + '<span class="sw" style="background:' + (LANG[row[0]] || '#8b949e') + '"></span>'
            + '<span class="nm">' + esc(row[0]) + '</span>'
            + '<span class="ct">' + row[1] + (row[1] === 1 ? ' repo' : ' repos') + '</span>'
            + '<span class="pc-v">' + Math.round(row[1] / total * 100) + '%</span></li>';
        }).join('') + '</ul></div>';
    host.hidden = false;

    const donut = $('#donut'), dn = $('#dn'), dk = $('#dk');
    const segs = $$('circle', donut), items = $$('#langlist li');
    function focus(i) {
      donut.dataset.hover = i === null ? 'false' : 'true';
      segs.forEach(s => { s.dataset.on = String(Number(s.dataset.i) === i); });
      items.forEach(li => { li.dataset.on = String(Number(li.dataset.i) === i); });
      if (i === null) { dn.textContent = total; dk.textContent = 'repositories'; }
      else { dn.textContent = Math.round(rows[i][1] / total * 100) + '%'; dk.textContent = rows[i][0]; }
    }
    [...segs, ...items].forEach(function (el) {
      const i = Number(el.dataset.i);
      el.addEventListener('mouseenter', () => focus(i));
      el.addEventListener('focus', () => focus(i));
      el.addEventListener('mouseleave', () => focus(null));
      el.addEventListener('blur', () => focus(null));
    });
  }

  if (featBox) {
    if (HAS_IO) {
      const gio = new IntersectionObserver(function (es) {
        if (es.some(e => e.isIntersecting)) { gio.disconnect(); loadRepos(); }
      }, { rootMargin: '320px' });
      gio.observe(featBox);
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
