/* ============================================================
   未来城 · admin editor
   Unlocked for accounts with the admin role (see auth.js).

   Model: edits are stored as { elementPath: innerHTML } per page in
   localStorage and re-applied on load, BEFORE site.js decorates the
   page. That covers copy, structure (add / duplicate / reorder /
   delete), media and accents without turning the site into a CMS.
   "Export page" then writes the changes back out as a real .html file
   you drop into the folder, so they become permanent for everyone.
   ============================================================ */
(function(){
  "use strict";

  var $  = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var K_CONTENT = 'fc_content', K_EDIT = 'fc_edit';

  /* ---------------- patch store ---------------- */
  function allContent(){
    try{ return JSON.parse(localStorage.getItem(K_CONTENT) || '{}'); }catch(e){ return {}; }
  }
  function pageContent(){ return allContent()[PAGE] || {}; }
  function savePage(map){
    var all = allContent();
    all[PAGE] = map;
    try{ localStorage.setItem(K_CONTENT, JSON.stringify(all)); return true; }
    catch(e){ alert('Could not save — this browser is out of local storage.'); return false; }
  }
  function clearPage(){
    var all = allContent();
    delete all[PAGE];
    try{ localStorage.setItem(K_CONTENT, JSON.stringify(all)); }catch(e){}
  }

  /* a stable-ish address for an element: the chain of child indices */
  function pathOf(el){
    var parts = [], node = el;
    while(node && node !== document.body){
      var parent = node.parentNode;
      if(!parent) break;
      parts.unshift(Array.prototype.indexOf.call(parent.children, node));
      node = parent;
    }
    return parts.join('.');
  }
  function elAt(path){
    var parts = String(path).split('.'), node = document.body, i;
    for(i = 0; i < parts.length; i++){
      node = node && node.children[parseInt(parts[i], 10)];
      if(!node) return null;
    }
    return node;
  }

  /* ---------------- apply saved edits (runs before site.js) ---------------- */
  function applyPatches(){
    var map = pageContent();
    Object.keys(map)
      .sort(function(a, b){ return a.split('.').length - b.split('.').length; })  // containers first
      .forEach(function(path){
        var el = elAt(path);
        if(el){ el.innerHTML = map[path]; }
      });
    if(map.__body_style){ document.body.setAttribute('style', map.__body_style); }
  }

  /* ---------------- what may be edited ---------------- */
  var TEXT_SELECTORS = [
    '.page-title', '.sec-title', '.sec-lede', '.page-tagline', '.hero-sub', '.hero-kicker',
    '.statement', '.body-copy', '.eyebrow', '.mark-hanzi', '.subhero-glyph',
    '.card-tag', '.card-title', '.card-copy', '.card-go', '.card-glyph', '.card-num',
    '.row-title', '.row-sub', '.row-copy', '.row-num',
    '.tier-level', '.tier-name', '.tier-copy', '.tier-temp',
    '.log-time', '.log-title', '.log-copy',
    '.meter-top .label', '.meter-top .value',
    '.chip', '.crumb', '.strip-cap', '.read-hint',
    'table.data th', 'table.data td', '.quote blockquote', '.quote cite',
    '.enter h2', '.enter p', '.enter-link', '.pn .dir', '.pn .nm', '.pn .g',
    'footer div', 'footer .fine', '.hud-panel', '.plate-read .read-title', '.plate-read .read-copy'
  ].join(',');

  /* containers whose children can be added / reordered / removed */
  var HOSTS = [
    { host: '.grid',            item: '.card',       label: 'quarter' },
    { host: '.rows',            item: '.row',        label: 'row' },
    { host: '.tiers',           item: '.tier',       label: 'tier' },
    { host: '.log',             item: '.log-item',   label: 'entry' },
    { host: '.readout',         item: '.meter',      label: 'meter' },
    { host: '.strip',           item: '.strip-cell', label: 'image' },
    { host: 'table.data tbody', item: 'tr',          label: 'table row' },
    { host: '.page-chips',      item: '.chip',       label: 'chip' },
    { host: '.foot-links',      item: 'a',           label: 'link' }
  ];

  /* ---------------- edit mode ---------------- */
  var editing = false, dirty = false, bar = null;

  function isOn(){ try{ return localStorage.getItem(K_EDIT) === '1'; }catch(e){ return false; } }
  function setOn(v){ try{ localStorage.setItem(K_EDIT, v ? '1' : '0'); }catch(e){} }

  function markDirty(){
    dirty = true;
    var d = bar && $('.dirty', bar);
    if(d){ d.textContent = '● unsaved'; }
  }
  function markClean(){
    dirty = false;
    var d = bar && $('.dirty', bar);
    if(d){ d.textContent = ''; }
  }

  function enterEdit(){
    if(!window.FCAuth || !FCAuth.isAdmin()){
      alert('Sign in as an admin to edit this page.');
      return;
    }
    editing = true;
    setOn(true);
    document.body.classList.add('fc-editing');

    // word-splitting wraps titles in spans, which fights contenteditable —
    // flatten those back to plain text for the duration of the session
    $$('[data-split]').forEach(function(el){
      el.textContent = el.textContent;
      el.removeAttribute('data-split');
    });

    $$(TEXT_SELECTORS).forEach(function(el){
      if(el.closest('.fc-bar, .fc-modal, nav.topbar')) return;
      el.setAttribute('data-fc-edit', '');
      el.setAttribute('contenteditable', 'true');
      el.addEventListener('input', markDirty);
    });

    HOSTS.forEach(function(spec){
      $$(spec.host).forEach(function(host){
        if(host.closest('.fc-bar, .fc-modal')) return;
        host.classList.add('fc-host');
        host.setAttribute('data-fc-item', spec.item);
        decorateItems(host, spec);
      });
    });

    buildBar();
  }

  function decorateItems(host, spec){
    $$(spec.item, host).forEach(function(item){
      if(item.parentNode !== host || $('.fc-tools', item)) return;
      item.classList.add('fc-item');
      var tools = document.createElement('div');
      tools.className = 'fc-tools';
      tools.setAttribute('contenteditable', 'false');
      tools.innerHTML =
        '<button type="button" title="Move up" data-op="up">↑</button>' +
        '<button type="button" title="Move down" data-op="down">↓</button>' +
        '<button type="button" title="Duplicate" data-op="copy">⧉</button>' +
        '<button type="button" class="del" title="Delete" data-op="del">✕</button>';
      tools.addEventListener('click', function(e){
        var op = e.target.getAttribute('data-op');
        if(!op) return;
        e.preventDefault(); e.stopPropagation();
        if(op === 'up' && item.previousElementSibling){ host.insertBefore(item, item.previousElementSibling); }
        else if(op === 'down' && item.nextElementSibling){ host.insertBefore(item.nextElementSibling, item); }
        else if(op === 'copy'){
          var clone = item.cloneNode(true);
          $$('.fc-tools', clone).forEach(function(t){ t.remove(); });
          clone.classList.remove('fc-item');
          host.insertBefore(clone, item.nextSibling);
          decorateItems(host, spec);
          reEditify(clone);
        }
        else if(op === 'del'){
          if(confirm('Delete this ' + spec.label + '?')) item.remove();
        }
        markDirty();
      });
      item.insertBefore(tools, item.firstChild);
    });

    if(!$('.fc-add', host.parentNode || host) || !host.nextElementSibling || !host.nextElementSibling.classList.contains('fc-add')){
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'fc-add';
      add.setAttribute('contenteditable', 'false');
      add.textContent = '+ add ' + spec.label;
      add.addEventListener('click', function(){
        var last = $$(spec.item, host).filter(function(n){ return n.parentNode === host; }).pop();
        if(!last){ alert('Nothing to copy from in this list yet.'); return; }
        var clone = last.cloneNode(true);
        $$('.fc-tools', clone).forEach(function(t){ t.remove(); });
        clone.classList.remove('fc-item');
        host.appendChild(clone);
        decorateItems(host, spec);
        reEditify(clone);
        markDirty();
        clone.scrollIntoView({ block:'center', behavior:'smooth' });
      });
      if(host.parentNode){ host.parentNode.insertBefore(add, host.nextSibling); }
    }
  }

  /* newly cloned nodes need the same editable wiring */
  function reEditify(scope){
    $$(TEXT_SELECTORS, scope).concat(scope.matches && scope.matches(TEXT_SELECTORS) ? [scope] : [])
      .forEach(function(el){
        el.setAttribute('data-fc-edit', '');
        el.setAttribute('contenteditable', 'true');
        el.addEventListener('input', markDirty);
      });
  }

  function exitEdit(reload){
    setOn(false);
    if(reload !== false){ location.reload(); }
  }

  /* ---------------- saving ---------------- */
  function harvest(){
    var map = pageContent();

    // structural containers: store the whole list
    $$('.fc-host').forEach(function(host){
      map[pathOf(host)] = cleanHTML(host.cloneNode(true)).innerHTML;
    });
    // individual text nodes
    $$('[data-fc-edit]').forEach(function(el){
      if(el.closest('.fc-host')) return;              // already covered by its container
      map[pathOf(el)] = cleanHTML(el.cloneNode(true)).innerHTML;
    });
    map.__body_style = document.body.getAttribute('style') || '';
    return map;
  }
  function save(){
    if(savePage(harvest())){
      markClean();
      flash('Saved to this browser. Use “Export page” to make it permanent.');
    }
  }

  /* strip everything the editor or site.js injected */
  function cleanHTML(node){
    $$('.fc-tools, .fc-add, .pin, .plate-nav button, .nav-drop, .fc-bar, .fc-modal, .account', node)
      .forEach(function(n){ n.remove(); });
    $$('[contenteditable]', node).forEach(function(n){ n.removeAttribute('contenteditable'); });
    $$('[data-fc-edit]', node).forEach(function(n){ n.removeAttribute('data-fc-edit'); });
    $$('[data-scrambled],[data-counted],[data-split]', node).forEach(function(n){
      n.removeAttribute('data-scrambled'); n.removeAttribute('data-counted'); n.removeAttribute('data-split');
    });
    $$('.in-view', node).forEach(function(n){ n.classList.remove('in-view'); });
    $$('.fc-item', node).forEach(function(n){ n.classList.remove('fc-item'); });
    $$('.fc-host', node).forEach(function(n){ n.classList.remove('fc-host'); n.removeAttribute('data-fc-item'); });
    $$('.meter-fill', node).forEach(function(n){ n.style.width = ''; });
    if(node.removeAttribute){ node.removeAttribute('contenteditable'); node.removeAttribute('data-fc-edit'); }
    return node;
  }

  /* ---------------- export ---------------- */
  function exportPage(){
    var clone = document.documentElement.cloneNode(true);

    // drop editor + runtime artefacts entirely
    $$('.fc-bar, .fc-modal, .account, .fc-tools, .fc-add, .pin, .nav-drop', clone)
      .forEach(function(n){ n.remove(); });
    $$('.plate-nav', clone).forEach(function(n){ n.innerHTML = ''; });
    $$('.ticker-track', clone).forEach(function(n){ n.innerHTML = ''; });
    var drg = $('#dragon', clone); if(drg){ drg.innerHTML = '<path id="dragonPath"/><g id="dragonHead"></g>'; drg.removeAttribute('viewBox'); drg.removeAttribute('style'); }
    var amb = $('#ambient', clone); if(amb){ amb.removeAttribute('width'); amb.removeAttribute('height'); amb.removeAttribute('style'); }
    var rain = $('#heroRain', clone); if(rain){ rain.removeAttribute('width'); rain.removeAttribute('height'); rain.removeAttribute('style'); }
    var hero = $('#heroMedia', clone); if(hero){ hero.removeAttribute('style'); }
    var clock = $('#hudTime', clone); if(clock){ clock.textContent = '--:--:--'; }
    var loader = $('#loader', clone); if(loader){ loader.classList.remove('is-hidden'); }
    var fill = $('#loaderFill', clone); if(fill){ fill.removeAttribute('style'); }
    clone.querySelector('body').classList.remove('fc-editing', 'ready');
    cleanHTML(clone);

    // put the word-split titles back to plain text
    $$('.w', clone).forEach(function(w){ w.replaceWith(document.createTextNode(w.textContent)); });

    var html = '<!doctype html>\n' + clone.outerHTML.replace(/\n{3,}/g, '\n\n');
    var blob = new Blob([html], { type:'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = PAGE;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    flash('Downloaded ' + PAGE + ' — replace the file in your site folder to publish it.');
  }

  /* ---------------- editor bar ---------------- */
  function flash(text){
    var f = bar && $('.flash', bar);
    if(!f) return;
    f.textContent = text;
    clearTimeout(f._t);
    f._t = setTimeout(function(){ f.textContent = ''; }, 6000);
  }
  function buildBar(){
    if(bar) return;
    bar = document.createElement('div');
    bar.className = 'fc-bar';
    bar.innerHTML =
      '<span class="mode"><i></i> Editing</span>' +
      '<span class="dirty"></span>' +
      '<span class="flash" style="color:var(--fog)"></span>' +
      '<span class="spacer"></span>' +
      '<button type="button" data-do="media">Media &amp; colour</button>' +
      '<button type="button" data-do="data">Ticker &amp; markers</button>' +
      '<button type="button" data-do="panel">Users</button>' +
      '<button type="button" class="warn" data-do="revert">Revert page</button>' +
      '<button type="button" data-do="done">Done</button>' +
      '<button type="button" data-do="export">Export page</button>' +
      '<button type="button" class="primary" data-do="save">Save</button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function(e){
      var op = e.target.getAttribute('data-do');
      if(!op) return;
      if(op === 'save') save();
      else if(op === 'export') exportPage();
      else if(op === 'done'){ if(dirty && !confirm('You have unsaved changes. Leave edit mode?')) return; exitEdit(); }
      else if(op === 'revert'){
        if(confirm('Discard every saved change on this page and restore the original file?')){
          clearPage(); setOn(false); location.reload();
        }
      }
      else if(op === 'panel') openPanel();
      else if(op === 'media') openMedia();
      else if(op === 'data') openData();
    });
  }

  /* ---------------- dialogs ---------------- */
  function dialog(title, sub, bodyHTML, onMount){
    var wrap = document.createElement('div');
    wrap.className = 'fc-modal fc-panel is-open';
    wrap.innerHTML =
      '<div class="fc-card" role="dialog" aria-modal="true">' +
        '<button class="fc-close" type="button">✕</button>' +
        '<h2>' + title + '</h2><p class="sub">' + sub + '</p>' + bodyHTML +
      '</div>';
    document.body.appendChild(wrap);
    function close(){ wrap.remove(); }
    wrap.querySelector('.fc-close').addEventListener('click', close);
    wrap.addEventListener('click', function(e){ if(e.target === wrap) close(); });
    if(onMount) onMount(wrap, close);
    return wrap;
  }

  function openPanel(){
    if(!FCAuth.isAdmin()){ alert('Admins only.'); return; }
    var list = FCAuth.users();
    var rows = list.length ? list.map(function(u){
      return '<li><span class="grow">' + FCAuth.escapeHtml(u.name) + '</span>' +
        '<span class="role' + (u.role === 'admin' ? '' : ' member') + '">' + u.role + '</span>' +
        '<button type="button" data-role="' + FCAuth.escapeHtml(u.name) + '">' +
          (u.role === 'admin' ? 'Make member' : 'Make admin') + '</button>' +
        '<button type="button" data-del="' + FCAuth.escapeHtml(u.name) + '">Delete</button></li>';
    }).join('') : '<li>No accounts yet.</li>';

    dialog('Site &amp; users', 'admin · ' + PAGE,
      '<ul class="fc-list">' + rows + '</ul>' +
      '<div class="fc-section-title">Stored edits</div>' +
      '<p style="font-family:var(--font-mono);font-size:.62rem;line-height:1.9;color:var(--fog);margin:0 0 14px">' +
        'Pages with unsaved-to-file changes: <b style="color:var(--mist)">' +
        (Object.keys(allContent()).join(', ') || 'none') + '</b>' +
      '</p>' +
      '<button class="fc-btn ghost" type="button" data-wipe>Discard all stored edits on every page</button>' +
      '<p class="fc-disclaimer"><b>Reminder:</b> accounts and edits are stored in this browser. Editing is a workflow, not a permission system — the published files are whatever you upload.</p>',
      function(wrap, close){
        wrap.querySelectorAll('[data-role]').forEach(function(b){
          b.addEventListener('click', function(){
            var n = b.getAttribute('data-role');
            var u = FCAuth.users().filter(function(x){ return x.name === n; })[0];
            var err = FCAuth.setRole(n, u && u.role === 'admin' ? 'member' : 'admin');
            if(err) alert(err);
            close(); openPanel();
          });
        });
        wrap.querySelectorAll('[data-del]').forEach(function(b){
          b.addEventListener('click', function(){
            var n = b.getAttribute('data-del');
            if(!confirm('Delete the account “' + n + '”?')) return;
            var err = FCAuth.removeUser(n);
            if(err) alert(err);
            close(); openPanel();
          });
        });
        wrap.querySelector('[data-wipe]').addEventListener('click', function(){
          if(!confirm('Discard stored edits for every page? Exported files are not affected.')) return;
          try{ localStorage.removeItem(K_CONTENT); }catch(e){}
          location.reload();
        });
      });
  }

  function openMedia(){
    var img = $('.subhero-media img') || $('.hero-media img');
    var audio = $('#track source');
    var body = document.body;
    var accent = (body.style.getPropertyValue('--accent') || '#4de8ff').trim();
    var accent2 = (body.style.getPropertyValue('--accent-2') || '#9a6bff').trim();

    dialog('Media &amp; colour', 'applies to ' + PAGE,
      '<div class="fc-field"><label>Hero image file</label>' +
        '<input id="fcImg" type="text" value="' + (img ? img.getAttribute('src') : '') + '"></div>' +
      '<div class="fc-field"><label>Audio track file</label>' +
        '<input id="fcAudio" type="text" value="' + (audio ? audio.getAttribute('src') : '') + '"></div>' +
      '<div class="fc-field"><label>Accent colour</label><input id="fcA1" type="color" value="' + accent + '"></div>' +
      '<div class="fc-field"><label>Second accent</label><input id="fcA2" type="color" value="' + accent2 + '"></div>' +
      '<button class="fc-btn" type="button" data-apply>Apply</button>' +
      '<p class="fc-disclaimer">Filenames are relative to the site folder — put the file next to the HTML and type its name, e.g. <b>my-city.png</b>. Spaces must be written as %20.</p>',
      function(wrap, close){
        wrap.querySelector('[data-apply]').addEventListener('click', function(){
          var v = $('#fcImg', wrap).value.trim();
          if(img && v){ $$('.subhero-media img, .hero-media img, .plate img, .strip-cell img').forEach(function(n){ n.setAttribute('src', v); }); }
          var av = $('#fcAudio', wrap).value.trim();
          if(audio && av){ audio.setAttribute('src', av); }
          body.style.setProperty('--accent', $('#fcA1', wrap).value);
          body.style.setProperty('--accent-2', $('#fcA2', wrap).value);
          markDirty(); close();
          flash('Applied. Remember to Save, then Export.');
        });
      });
  }

  /* the ticker lines and plate markers live in an inline <script>, so we
     rewrite that script's text — the export then picks it up verbatim */
  function openData(){
    var script = $$('script:not([src])').filter(function(s){ return /FC_TICKER|FC_PINS/.test(s.textContent); })[0];
    if(!script){ alert('This page has no ticker or marker data.'); return; }
    var ticker = JSON.stringify(window.FC_TICKER || [], null, 2);
    var pins = window.FC_PINS ? JSON.stringify(window.FC_PINS, null, 2) : '';

    dialog('Ticker &amp; markers', 'raw data for ' + PAGE,
      '<div class="fc-field"><label>Ticker lines (JSON array)</label>' +
        '<textarea id="fcTick">' + FCAuth.escapeHtml(ticker) + '</textarea></div>' +
      (pins ? '<div class="fc-field"><label>Plate markers (JSON array)</label>' +
        '<textarea id="fcPins" style="min-height:220px">' + FCAuth.escapeHtml(pins) + '</textarea></div>' : '') +
      '<button class="fc-btn" type="button" data-apply>Apply</button>' +
      '<p class="fc-disclaimer">Marker <b>x</b> and <b>y</b> are percentages across the image. Invalid JSON is refused rather than saved.</p>',
      function(wrap, close){
        wrap.querySelector('[data-apply]').addEventListener('click', function(){
          var t, p = null;
          try{ t = JSON.parse($('#fcTick', wrap).value); }
          catch(e){ alert('Ticker JSON is invalid: ' + e.message); return; }
          if($('#fcPins', wrap)){
            try{ p = JSON.parse($('#fcPins', wrap).value); }
            catch(e){ alert('Marker JSON is invalid: ' + e.message); return; }
          }
          var src = 'window.FC_TICKER = ' + JSON.stringify(t, null, 2) + ';\n';
          if(p){ src += '\nwindow.FC_PINS = ' + JSON.stringify(p, null, 2) + ';\n'; }
          script.textContent = '\n' + src;
          markDirty(); close();
          flash('Data updated. Save, Export, then reload to see it render.');
        });
      });
  }

  /* ---------------- boot ---------------- */
  applyPatches();                       // before site.js reads the DOM

  window.FCAdmin = {
    toggleEdit: function(){ editing ? exitEdit() : enterEdit(); },
    openPanel: openPanel,
    isEditing: function(){ return editing; }
  };

  // resume an edit session across a reload / navigation
  if(isOn()){
    window.FC_NO_SPLIT = true;          // site.js checks this
    var start = function(){
      if(window.FCAuth && FCAuth.isAdmin()){ enterEdit(); }
      else { setOn(false); }
    };
    if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', start); }
    else { start(); }
  }

  window.addEventListener('beforeunload', function(e){
    if(editing && dirty){ e.preventDefault(); e.returnValue = ''; }
  });
})();
