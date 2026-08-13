// RSS Operations & Policy Guide — app logic
// Renders RSS_DATA (data.js) into the page, injects screenshots from
// RSS_MEDIA (media.js), and powers the smart search.

(function () {
  const navTree = document.getElementById('navTree');
  const docBody = document.getElementById('docBody');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');

  // ---------------------------------------------------------------
  // 1. Render sidebar navigation
  // ---------------------------------------------------------------
  RSS_DATA.forEach((cat, ci) => {
    const wrap = document.createElement('div');
    wrap.className = 'nav-cat' + (ci === 0 ? ' open' : '');
    wrap.dataset.cat = cat.id;

    const btn = document.createElement('button');
    btn.className = 'nav-cat-btn';
    btn.innerHTML = `<span>${escapeHtml(cat.label)}</span><span class="nav-cat-chevron">▶</span>`;
    btn.addEventListener('click', () => wrap.classList.toggle('open'));
    wrap.appendChild(btn);

    const ul = document.createElement('ul');
    ul.className = 'nav-items';
    cat.items.forEach(sec => {
      const li = document.createElement('li');
      li.className = 'nav-item';
      const a = document.createElement('a');
      a.href = '#' + sec.id;
      a.dataset.target = sec.id;
      a.textContent = (sec.number ? sec.number + '. ' : '') + sec.title;
      li.appendChild(a);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    navTree.appendChild(wrap);
  });

  // ---------------------------------------------------------------
  // 2. Render main content
  // ---------------------------------------------------------------
  const searchIndex = []; // {anchorId, breadcrumb, title, text, kind}

  RSS_DATA.forEach(cat => {
    const catDiv = document.createElement('div');
    catDiv.className = 'category-block';
    catDiv.innerHTML = `<div class="category-heading">${escapeHtml(cat.label)}</div>`;

    cat.items.forEach(sec => {
      const card = document.createElement('div');
      card.className = 'section-card';
      card.id = sec.id;

      let html = '';
      if (sec.number) html += `<span class="section-num">${escapeHtml(sec.number)}</span>`;
      html += `<h2 class="section-title">${escapeHtml(sec.title)}</h2>`;
      if (sec.introHtml && sec.introHtml.trim()) {
        html += `<div class="section-intro">${sec.introHtml}</div>`;
      }
      html += renderMedia(sec.id);

      sec.blocks.forEach(b => {
        html += `<div class="block" id="${escapeAttr(b.id)}">`;
        html += `<h3 class="block-title">${escapeHtml(b.heading)}</h3>`;
        html += b.html;
        html += renderMedia(b.id);
        html += `</div>`;
      });

      card.innerHTML = html;
      catDiv.appendChild(card);

      // index: section-level (title + intro)
      searchIndex.push({
        anchorId: sec.id,
        breadcrumb: cat.label,
        title: (sec.number ? sec.number + '. ' : '') + sec.title,
        text: sec.introText || '',
        kind: 'section'
      });
      // index: block-level
      sec.blocks.forEach(b => {
        searchIndex.push({
          anchorId: b.id,
          breadcrumb: cat.label + ' › ' + (sec.number ? sec.number + '. ' : '') + sec.title,
          title: b.heading,
          text: b.text || '',
          kind: 'block'
        });
      });
      // index: row-level (flat reference tables with per-row ids, e.g. Glossary, Quick Policy Library)
      card.querySelectorAll('tr[id]').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 2) return;
        searchIndex.push({
          anchorId: tr.id,
          breadcrumb: cat.label + ' › ' + (sec.number ? sec.number + '. ' : '') + sec.title,
          title: cells[0].textContent.trim(),
          text: cells[1].textContent.trim(),
          kind: 'row'
        });
      });
    });

    docBody.appendChild(catDiv);
  });

  function renderMedia(blockId) {
    const shots = (typeof RSS_MEDIA !== 'undefined' && RSS_MEDIA[blockId]) ? RSS_MEDIA[blockId] : null;
    if (!shots || !shots.length) return '';
    let out = '<div class="shot-gallery">';
    shots.forEach(s => {
      out += `<figure class="shot">
        <img src="${escapeAttr(s.file)}" alt="${escapeAttr(s.caption || '')}" loading="lazy"
             onerror="this.closest('.shot').innerHTML='<div class=&quot;shot-placeholder&quot;>Screenshot not found: ${escapeAttr(s.file)}</div>'">
        ${s.caption ? `<figcaption class="shot-caption">${escapeHtml(s.caption)}</figcaption>` : ''}
      </figure>`;
    });
    out += '</div>';
    return out;
  }

  // ---------------------------------------------------------------
  // 3. Smart search
  // ---------------------------------------------------------------
  function normalize(s) {
    return (s || '').toLowerCase();
  }

  function scoreEntry(entry, terms) {
    const titleN = normalize(entry.title);
    const textN = normalize(entry.text);
    let score = 0;
    for (const t of terms) {
      if (!t) continue;
      if (titleN.includes(t)) score += titleN.startsWith(t) ? 12 : 8;
      if (textN.includes(t)) score += 3;
      // whole-word bonus (helps acronyms like CAD, LMTR, SSUP)
      const wordRe = new RegExp('\\b' + escapeRegex(t) + '\\b', 'i');
      if (wordRe.test(entry.title)) score += 4;
      if (wordRe.test(entry.text)) score += 2;
    }
    return score;
  }

  function snippetFor(entry, terms) {
    const text = entry.text || '';
    if (!text) return '';
    const textN = normalize(text);
    let idx = -1;
    for (const t of terms) {
      if (!t) continue;
      const i = textN.indexOf(t);
      if (i !== -1) { idx = i; break; }
    }
    let start = 0, end = Math.min(text.length, 160);
    if (idx !== -1) {
      start = Math.max(0, idx - 60);
      end = Math.min(text.length, idx + 100);
    }
    let snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    return highlight(snippet, terms);
  }

  function highlight(str, terms) {
    let out = escapeHtml(str);
    terms.forEach(t => {
      if (!t) return;
      const re = new RegExp('(' + escapeRegex(escapeHtml(t)) + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  let currentResults = [];
  let selIndex = -1;

  function runSearch(query) {
    const q = query.trim();
    if (!q) {
      searchResults.classList.remove('show');
      searchResults.innerHTML = '';
      currentResults = [];
      selIndex = -1;
      return;
    }
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    const scored = searchIndex
      .map(e => ({ e, s: scoreEntry(e, terms) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 10);

    currentResults = scored;
    selIndex = -1;

    if (!scored.length) {
      searchResults.innerHTML = `<div class="search-empty">No matches for “${escapeHtml(q)}”. Try a different keyword, code, or term.</div>`;
      searchResults.classList.add('show');
      return;
    }

    searchResults.innerHTML = scored.map((x, i) => {
      const e = x.e;
      const titleHl = highlight(e.title, terms);
      const snippet = snippetFor(e, terms);
      return `<a class="search-result" data-idx="${i}" data-anchor="${escapeAttr(e.anchorId)}">
        <div class="sr-breadcrumb">${escapeHtml(e.breadcrumb)}</div>
        <div class="sr-title">${titleHl}</div>
        ${snippet ? `<div class="sr-snippet">${snippet}</div>` : ''}
      </a>`;
    }).join('');
    searchResults.classList.add('show');
  }

  function goToAnchor(id) {
    const el = document.getElementById(id);
    if (!el) return;
    // open the containing nav category if collapsed
    const link = navTree.querySelector(`a[data-target="${cssEscape(id)}"]`);
    if (link) {
      const cat = link.closest('.nav-cat');
      if (cat) cat.classList.add('open');
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    searchResults.classList.remove('show');
    searchInput.value = '';
    closeSidebarMobile();
    try { history.replaceState(null, '', '#' + id); } catch (err) { /* ignore on restricted protocols */ }
    setActiveNav(nearestSectionId(el));
  }

  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function nearestSectionId(el) {
    const card = el.closest('.section-card');
    return card ? card.id : el.id;
  }

  searchInput.addEventListener('input', e => runSearch(e.target.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { searchResults.classList.remove('show'); searchInput.blur(); }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!currentResults.length) return;
      selIndex = Math.min(currentResults.length - 1, selIndex + 1);
      updateSelHighlight();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!currentResults.length) return;
      selIndex = Math.max(0, selIndex - 1);
      updateSelHighlight();
    }
    if (e.key === 'Enter') {
      if (selIndex >= 0 && currentResults[selIndex]) {
        goToAnchor(currentResults[selIndex].e.anchorId);
      } else if (currentResults.length) {
        goToAnchor(currentResults[0].e.anchorId);
      }
    }
  });

  function updateSelHighlight() {
    [...searchResults.querySelectorAll('.search-result')].forEach((n, i) => {
      n.classList.toggle('sel', i === selIndex);
    });
    const sel = searchResults.querySelector('.search-result.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  searchResults.addEventListener('click', e => {
    const a = e.target.closest('.search-result');
    if (a) goToAnchor(a.dataset.anchor);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) searchResults.classList.remove('show');
  });

  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // ---------------------------------------------------------------
  // 4. Sidebar nav link clicks + active-state tracking
  // ---------------------------------------------------------------
  navTree.addEventListener('click', e => {
    const a = e.target.closest('a[data-target]');
    if (!a) return;
    e.preventDefault();
    goToAnchor(a.dataset.target);
  });

  // In-content cross-reference links (e.g. Quick Task Finder "Go to" column)
  docBody.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    goToAnchor(decodeURIComponent(a.getAttribute('href').slice(1)));
  });

  function setActiveNav(sectionId) {
    navTree.querySelectorAll('a.active').forEach(a => a.classList.remove('active'));
    const link = navTree.querySelector(`a[data-target="${cssEscape(sectionId)}"]`);
    if (link) link.classList.add('active');
  }

  const sectionCards = [...document.querySelectorAll('.section-card')];
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveNav(entry.target.id);
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    sectionCards.forEach(c => observer.observe(c));
  }

  // ---------------------------------------------------------------
  // 5. Mobile sidebar toggle
  // ---------------------------------------------------------------
  function openSidebarMobile() { sidebar.classList.add('open'); sidebarBackdrop.classList.add('show'); }
  function closeSidebarMobile() { sidebar.classList.remove('open'); sidebarBackdrop.classList.remove('show'); }
  menuToggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebarMobile() : openSidebarMobile());
  sidebarBackdrop.addEventListener('click', closeSidebarMobile);

  // ---------------------------------------------------------------
  // 6. Deep-link on load
  // ---------------------------------------------------------------
  if (location.hash) {
    const id = decodeURIComponent(location.hash.slice(1));
    requestAnimationFrame(() => goToAnchor(id));
  } else {
    setActiveNav(RSS_DATA[0].items[0].id);
  }
})();
