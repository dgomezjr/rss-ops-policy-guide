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
      html += `<h2 class="section-title">${escapeHtml(sec.title)}${copyLinkBtn(sec.id, 'section')}</h2>`;
      if (sec.introHtml && sec.introHtml.trim()) {
        html += `<div class="section-intro">${sec.introHtml}</div>`;
      }
      html += renderMedia(sec.id);

      sec.blocks.forEach(b => {
        html += `<div class="block" id="${escapeAttr(b.id)}">`;
        html += `<h3 class="block-title">${escapeHtml(b.heading)}${copyLinkBtn(b.id, 'procedure')}</h3>`;
        html += b.html;
        html += renderMedia(b.id);
        html += `</div>`;
      });

      card.innerHTML = html;
      catDiv.appendChild(card);

      // index: section-level (title + intro) — text is read from the
      // rendered DOM, not a separately-authored duplicate, so it can
      // never drift out of sync with what's actually on the page.
      const introEl = card.querySelector('.section-intro');
      searchIndex.push({
        anchorId: sec.id,
        breadcrumb: cat.label,
        title: (sec.number ? sec.number + '. ' : '') + sec.title,
        text: introEl ? introEl.textContent.replace(/\s+/g, ' ').trim() : (sec.introText || ''),
        kind: 'section'
      });
      // index: block-level
      sec.blocks.forEach(b => {
        const blockEl = card.querySelector('#' + cssEscape(b.id));
        let text = b.text || '';
        if (blockEl) {
          const clone = blockEl.cloneNode(true);
          const title = clone.querySelector('.block-title');
          if (title) title.remove();
          text = clone.textContent.replace(/\s+/g, ' ').trim();
        }
        searchIndex.push({
          anchorId: b.id,
          breadcrumb: cat.label + ' › ' + (sec.number ? sec.number + '. ' : '') + sec.title,
          title: b.heading,
          text: text,
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

  function copyLinkBtn(id, kind) {
    return ` <button type="button" class="copy-link-btn" data-id="${escapeAttr(id)}" title="Copy link to this ${kind}" aria-label="Copy link to this ${kind}">🔗</button>`;
  }

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
  // 2c. Auto-link emails, URLs & Smartsheet links; make them copyable.
  //     Runs over the rendered content once, after everything is in
  //     the DOM — doesn't touch goto-links or any existing <a> tags.
  // ---------------------------------------------------------------
  const COPY_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 11V3.5C4 2.67157 4.67157 2 5.5 2H10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

  function linkifyContent(root) {
    const COMBINED_RE = /(https?:\/\/[^\s<>()"']+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/@|https?:\/\//.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        let p = node.parentElement;
        while (p && p !== root) {
          if (p.tagName === 'A' || p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(node => {
      const text = node.nodeValue;
      COMBINED_RE.lastIndex = 0;
      let match, lastIndex = 0, found = false;
      const frag = document.createDocumentFragment();
      while ((match = COMBINED_RE.exec(text))) {
        found = true;
        const urlMatch = match[1];
        let value = match[0];
        let trailing = '';
        if (urlMatch) {
          const trim = value.match(/[).,;:!?'"]+$/);
          if (trim) { trailing = trim[0]; value = value.slice(0, -trailing.length); }
        }
        if (match.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        const a = document.createElement('a');
        a.className = 'auto-link';
        a.textContent = value;
        if (urlMatch) { a.href = value; a.target = '_blank'; a.rel = 'noopener'; }
        else { a.href = 'mailto:' + value; }
        frag.appendChild(a);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inline-copy-btn';
        btn.dataset.copyText = value;
        const label = urlMatch ? 'Copy link' : 'Copy email address';
        btn.title = label;
        btn.setAttribute('aria-label', label);
        btn.innerHTML = COPY_ICON_SVG;
        frag.appendChild(btn);
        if (trailing) frag.appendChild(document.createTextNode(trailing));
        lastIndex = match.index + match[0].length;
      }
      if (!found) return;
      if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(frag, node);
    });
  }
  linkifyContent(docBody);

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
    const inlineCopyBtn = e.target.closest('.inline-copy-btn');
    if (inlineCopyBtn) {
      const text = inlineCopyBtn.dataset.copyText;
      const done = () => {
        inlineCopyBtn.classList.add('copied');
        clearTimeout(inlineCopyBtn._copiedTimer);
        inlineCopyBtn._copiedTimer = setTimeout(() => inlineCopyBtn.classList.remove('copied'), 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* ignore */ }
        document.body.removeChild(ta);
        done();
      }
      return;
    }
    const copyBtn = e.target.closest('.copy-link-btn');
    if (copyBtn) {
      const url = location.origin + location.pathname + '#' + copyBtn.dataset.id;
      const done = () => {
        copyBtn.classList.add('copied');
        clearTimeout(copyBtn._copiedTimer);
        copyBtn._copiedTimer = setTimeout(() => copyBtn.classList.remove('copied'), 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) { /* ignore */ }
        document.body.removeChild(ta);
        done();
      }
      return;
    }
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

  // ---------------------------------------------------------------
  // 7. Sidebar expand/collapse all
  // ---------------------------------------------------------------
  const navToggleAll = document.getElementById('navToggleAll');
  if (navToggleAll) {
    navToggleAll.addEventListener('click', () => {
      const cats = [...navTree.querySelectorAll('.nav-cat')];
      const anyClosed = cats.some(c => !c.classList.contains('open'));
      cats.forEach(c => c.classList.toggle('open', anyClosed));
      navToggleAll.textContent = anyClosed ? 'Collapse all' : 'Expand all';
    });
  }

  // ---------------------------------------------------------------
  // 8. Back to top
  // ---------------------------------------------------------------
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
