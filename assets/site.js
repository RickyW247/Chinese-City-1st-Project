/* ============================================================
   未来城 · FUTURE CITY — shared behaviour
   Loaded by index.html and every district page.
   Page-specific data can be supplied before this script:
     window.FC_TICKER = ['...']            (ticker lines)
     window.FC_PINS   = [{x,y,...}]        (home plate hotspots)
   ============================================================ */
(function(){
  "use strict";

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer:coarse)').matches;
  var $  = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  function two(n){ return ('0' + n).slice(-2); }
  function cssVar(n, fallback){
    var v = getComputedStyle(document.body).getPropertyValue(n).trim();
    return v || fallback;
  }

  /* ---------- the six quarters, in order ---------- */
  var QUARTERS = [
    { id:'lantern-quarter',  file:'lantern-quarter.html',  glyph:'灯', name:'Lantern Quarter',   hue:'#ff3d64' },
    { id:'floating-market',  file:'floating-market.html',  glyph:'市', name:'The Floating Market', hue:'#f0b45c' },
    { id:'river-dragon',     file:'river-dragon.html',     glyph:'龙', name:'The River Dragon',  hue:'#4de8ff' },
    { id:'sky-harbor',       file:'sky-harbor.html',       glyph:'空', name:'Sky Harbor',        hue:'#9a6bff' },
    { id:'temple-towers',    file:'temple-towers.html',    glyph:'塔', name:'Temple Towers',     hue:'#f0b45c' },
    { id:'ink-canals',       file:'ink-canals.html',       glyph:'墨', name:'The Ink Canals',    hue:'#ff3d64' }
  ];
  window.FC_QUARTERS = QUARTERS;
  var here = document.body.getAttribute('data-district') || '';

  /* ============================================================
     TEXT ANIMATION
     ============================================================ */

  /* split an element's text into word spans, keeping inner tags intact */
  var wordIndex = 0;
  function splitWords(el){
    if(!el || el.getAttribute('data-split')) return;
    el.setAttribute('data-split','words');
    var n = 0;
    (function walk(node){
      $$('*', node); // no-op guard for empty nodes
      Array.prototype.slice.call(node.childNodes).forEach(function(child){
        if(child.nodeType === 3){
          if(!child.nodeValue.trim()){ return; }
          var frag = document.createDocumentFragment();
          child.nodeValue.split(/(\s+)/).forEach(function(part){
            if(!part) return;
            if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }
            var outer = document.createElement('span');
            outer.className = 'w';
            var inner = document.createElement('span');
            inner.className = 'wi';
            inner.style.setProperty('--i', n++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if(child.nodeType === 1 && child.className !== 'w'){
          walk(child);
        }
      });
    })(el);
    wordIndex += n;
  }

  /* split into single characters — for the big hanzi marks */
  function splitChars(el){
    if(!el || el.getAttribute('data-split')) return;
    el.setAttribute('data-split','chars');
    var n = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function(child){
      if(child.nodeType !== 3 || !child.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      child.nodeValue.split('').forEach(function(ch){
        if(!ch.trim()){ frag.appendChild(document.createTextNode(ch)); return; }
        var outer = document.createElement('span');
        outer.className = 'w';
        var inner = document.createElement('span');
        inner.className = 'wi';
        inner.style.setProperty('--i', n++);
        inner.textContent = ch;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      el.replaceChild(frag, child);
    });
  }

  var SPLIT_WORDS = '.page-title, .sec-title, .statement, .enter h2, .quote blockquote, .read-title, .pn .nm';
  var SPLIT_CHARS = '.mark-hanzi, .subhero-glyph';
  // the admin editor sets this: split spans and contenteditable don't mix
  if(!window.FC_NO_SPLIT){
    $$(SPLIT_WORDS).forEach(splitWords);
    $$(SPLIT_CHARS).forEach(splitChars);
  }

  /* mono labels decode themselves on reveal */
  var GLYPHS = '未来城龙灯市空塔墨水火风0123456789ABCDEFGHJKLMNPRSTUVWXZ/·';
  function scramble(el){
    if(!el || reduceMotion || el.getAttribute('data-scrambled')) return;
    if(el.children.length) return;                 // leaf nodes only
    var finalText = el.textContent;
    if(finalText.length > 46) return;
    el.setAttribute('data-scrambled','1');
    var len = finalText.length, dur = 420 + len * 16, t0 = performance.now();
    (function step(now){
      var p = Math.min(1, (now - t0) / dur);
      var shown = Math.floor(p * len), out = '';
      for(var i = 0; i < len; i++){
        var c = finalText.charAt(i);
        out += (i < shown || c === ' ' || c === '·' || c === '/') ? c
             : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      el.textContent = out;
      if(p < 1){ requestAnimationFrame(step); } else { el.textContent = finalText; }
    })(t0);
  }
  var SCRAMBLE = '.eyebrow, .card-tag, .row-sub, .tier-level, .log-time, .read-index, .chip b, .crumb b, .meter-top .label, .card-go, .pn .dir, .hero-kicker';

  /* meter values count up */
  function countUp(el){
    if(!el || reduceMotion || el.getAttribute('data-counted')) return;
    var text = el.textContent;
    var m = text.match(/\d[\d,]*\.?\d*/);
    if(!m) return;
    el.setAttribute('data-counted','1');
    var raw = m[0];
    var target = parseFloat(raw.replace(/,/g, ''));
    if(!isFinite(target)) return;
    var decimals = (raw.split('.')[1] || '').length;
    var grouped = raw.indexOf(',') > -1;
    var t0 = performance.now(), dur = 1000;
    (function step(now){
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = (target * eased).toFixed(decimals);
      if(grouped){ v = Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals }); }
      el.textContent = text.replace(raw, v);
      if(p < 1){ requestAnimationFrame(step); } else { el.textContent = text; }
    })(t0);
  }

  /* ============================================================
     LOADER
     ============================================================ */
  var loader = $('#loader'), loaderFill = $('#loaderFill');
  if(loader){
    var pct = 0, settled = false;
    var loadTimer = setInterval(function(){
      pct = Math.min(100, pct + 16 + Math.random() * 20);
      loaderFill.style.width = pct + '%';
      if(pct >= 100){ clearInterval(loadTimer); }
    }, 160);
    var finishLoad = function(){
      if(settled) return;
      settled = true;
      clearInterval(loadTimer);
      loaderFill.style.width = '100%';
      setTimeout(function(){
        loader.classList.add('is-hidden');
        document.body.classList.add('ready');
        $$('.subhero ' + SCRAMBLE).forEach(function(el, i){ setTimeout(function(){ scramble(el); }, 220 + i * 70); });
        // the page height is only final once the loader is out of the way
        if(typeof buildDragon === 'function'){ buildDragon(); onScroll(); }
      }, 340);
    };
    var heroImg = $('.subhero-media img, .hero-media img');
    if(heroImg && !heroImg.complete){ heroImg.addEventListener('load', finishLoad); heroImg.addEventListener('error', finishLoad); }
    else if(heroImg){ requestAnimationFrame(finishLoad); }
    window.addEventListener('load', finishLoad);
    setTimeout(finishLoad, 2500);
  } else {
    document.body.classList.add('ready');
  }

  /* ============================================================
     NAV
     ============================================================ */
  var menu = $('#navMenu');
  if(menu){
    var drop = document.createElement('ul');
    drop.className = 'nav-drop';
    QUARTERS.forEach(function(q){
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + q.file + '" style="--dot:' + q.hue + '"' +
        (q.id === here ? ' class="active"' : '') + '>' +
        '<span class="g">' + q.glyph + '</span>' + q.name + '</a>';
      drop.appendChild(li);
    });
    menu.appendChild(drop);
    if(here){ menu.classList.add('is-current'); }
    var btn = $('button', menu);
    var close = function(){ menu.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); };
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = menu.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('mouseenter', function(){ menu.classList.add('is-open'); });
    menu.addEventListener('mouseleave', close);
    document.addEventListener('click', close);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ close(); } });
  }

  /* ---------- ticker ---------- */
  var track = $('#tickerTrack');
  if(track){
    var lines = window.FC_TICKER || [
      '<em>灯</em> LANTERN GRID NOMINAL · 41,208 LIT',
      'WEATHER: <b>LIGHT RAIN</b> · VISIBILITY 18KM',
      '<em>龙</em> DRAGON BROADCAST — UNINTERRUPTED SINCE 2061'
    ];
    var row = lines.map(function(t){ return '<span>' + t + '</span>'; }).join('');
    track.innerHTML = row + row;
  }

  /* ---------- card spotlight ---------- */
  $$('.card').forEach(function(c){
    c.addEventListener('pointermove', function(e){
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- a spinning 3D cube on every clickable quarter ---------- */
  function mountCube(host, glyph){
    if(!host || !glyph || $('.cube-wrap', host)) return;
    var wrap = document.createElement('span');
    wrap.className = 'cube-wrap';
    wrap.setAttribute('aria-hidden', 'true');
    var cube = document.createElement('span');
    cube.className = 'cube';
    for(var i = 0; i < 6; i++){
      var face = document.createElement('b');
      face.textContent = glyph;
      cube.appendChild(face);
    }
    wrap.appendChild(cube);
    host.appendChild(wrap);
    // stagger them so the grid doesn't pulse in lockstep
    var off = (Math.random() * -14).toFixed(2) + 's';
    cube.style.animationDelay = off;
    wrap.style.animationDelay = (Math.random() * -7).toFixed(2) + 's';
  }
  $$('.card').forEach(function(c){
    var g = $('.card-glyph', c);
    mountCube(c, g ? g.textContent.trim() : '');
  });
  $$('.pn').forEach(function(p){
    var g = $('.g', p);
    mountCube(p, g ? g.textContent.trim() : '');
  });

  /* ---------- reveal ---------- */
  function activate(el){
    el.classList.add('in-view');
    $$(SCRAMBLE, el).forEach(function(s, i){ setTimeout(function(){ scramble(s); }, 90 + i * 55); });
    if(el.matches && el.matches(SCRAMBLE)){ scramble(el); }
    $$('.meter-fill', el).forEach(function(f){ f.style.width = f.getAttribute('data-target') + '%'; });
    $$('.meter-top .value', el).forEach(function(v, i){ setTimeout(function(){ countUp(v); }, 120 + i * 80); });
  }
  var revealEls = $$('[data-reveal]');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        activate(e.target);
        io.unobserve(e.target);
      });
    }, { threshold:.12 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(activate);
  }

  /* ---------- active nav link ---------- */
  var navLinks = $$('.nav-links a[href^="#"]');
  var navTargets = navLinks.map(function(a){ return $(a.getAttribute('href')); });
  function syncNav(){
    var best = -1, bestTop = -Infinity;
    navTargets.forEach(function(s, i){
      if(!s) return;
      var t = s.getBoundingClientRect().top - 130;
      if(t <= 0 && t > bestTop){ bestTop = t; best = i; }
    });
    navLinks.forEach(function(a, i){ a.classList.toggle('active', i === best); });
  }

  /* ---------- cursor ---------- */
  var glowEl = $('#cursorGlow'), ringEl = $('#cursorRing');
  var fine = window.matchMedia('(pointer:fine)').matches;
  if(glowEl && ringEl){
    if(!fine || reduceMotion){
      glowEl.style.display = 'none';
      ringEl.style.display = 'none';
    } else {
      var gx = innerWidth/2, gy = innerHeight/2, cx = gx, cy = gy;
      window.addEventListener('mousemove', function(e){
        gx = e.clientX; gy = e.clientY;
        ringEl.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
        ringEl.style.opacity = '1';
        var hot = e.target && e.target.closest ? e.target.closest('a,button,.card,.pin,tr') : null;
        ringEl.classList.toggle('is-hover', !!hot);
      });
      (function cursorLoop(){
        cx += (gx-cx)*.12; cy += (gy-cy)*.12;
        glowEl.style.transform = 'translate(' + (cx-230) + 'px,' + (cy-230) + 'px)';
        requestAnimationFrame(cursorLoop);
      })();
    }
  }

  /* ============================================================
     THE DRAGON — a swirling helix down the whole page
     ============================================================ */
  var svg = $('#dragon');
  var dgHalo, dgBody, dgScales, dgFins, dgLegs, dgHead, dgClipRect;
  var DW = 0, DH = 0, turns = 4, N = 220, phase = 0;
  var samples = [];

  function dragonInit(){
    if(!svg) return;
    var a = cssVar('--accent', '#4de8ff');
    var b = cssVar('--accent-2', '#9a6bff');
    svg.innerHTML =
      '<defs>' +
        '<linearGradient id="dgGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + a + '"/>' +
          '<stop offset=".45" stop-color="' + b + '"/>' +
          '<stop offset="1" stop-color="' + a + '"/>' +
        '</linearGradient>' +
        '<clipPath id="dgClip"><rect id="dgClipRect" x="-200" y="0" width="4000" height="0"/></clipPath>' +
      '</defs>' +
      '<g clip-path="url(#dgClip)" shape-rendering="optimizeSpeed">' +
        // soft outer halo — cheaper than a CSS filter over a full-page layer
        '<path id="dgHalo" fill="none" stroke="url(#dgGrad)" stroke-width="16" stroke-opacity=".16" stroke-linejoin="round"/>' +
        '<path id="dgFins" fill="url(#dgGrad)" opacity=".42"/>' +
        '<path id="dgBody" fill="url(#dgGrad)" opacity=".46" stroke="' + a + '" stroke-opacity=".55" stroke-width="1.2"/>' +
        '<path id="dgScales" fill="none" stroke="#ffffff" stroke-opacity=".2" stroke-width=".9"/>' +
        '<path id="dgLegs" fill="none" stroke="' + a + '" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>' +
      '</g>' +
      '<g id="dgHead"></g>';
    dgHalo = $("#dgHalo"); dgBody = $("#dgBody"); dgScales = $('#dgScales'); dgFins = $('#dgFins');
    dgLegs = $('#dgLegs'); dgHead = $('#dgHead'); dgClipRect = $('#dgClipRect');

    dgHead.innerHTML =
      // mane
      '<path d="M-7,-8 L-17,-14 L-11,-5 L-20,-3 L-10,1 L-18,9 L-7,8 Z" fill="' + b + '" opacity=".75"/>' +
      // skull
      '<path d="M-7,-8 C4,-10 15,-6 20,0 C15,6 4,10 -7,8 C-10,4 -10,-4 -7,-8 Z" fill="' + a + '" opacity=".92"/>' +
      // jaw line
      '<path d="M6,4 C11,6 16,4 19,1" fill="none" stroke="#05060d" stroke-opacity=".55" stroke-width="1.4"/>' +
      // horns
      '<path d="M-3,-7 C-9,-13 -14,-17 -21,-20" fill="none" stroke="' + a + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M1,-7 C-4,-12 -7,-16 -12,-21" fill="none" stroke="' + a + '" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
      // whiskers
      '<path d="M17,-2 C24,-6 29,-13 27,-21" fill="none" stroke="' + b + '" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M17,3 C24,4 30,9 31,17" fill="none" stroke="' + b + '" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>' +
      // eye
      '<circle cx="6" cy="-3" r="2.2" fill="#05060d"/>' +
      '<circle cx="6" cy="-3" r="1" fill="#ffffff"/>';
  }

  function geometry(ph){
    samples = [];
    var cxp = DW / 2;
    var amp = Math.min(DW * 0.34, 330);
    for(var i = 0; i <= N; i++){
      var t = i / N;
      var ang = t * turns * Math.PI * 2 + ph;
      var taper = Math.sin(Math.min(t * 5, 1) * Math.PI / 2) * Math.sin(Math.min((1 - t) * 7, 1) * Math.PI / 2);
      var A = amp * (0.42 + 0.58 * taper);
      var depth = Math.cos(ang);                        // +1 near, −1 far
      var near = 0.45 + 0.55 * (depth * 0.5 + 0.5);
      samples.push({
        x: cxp + Math.sin(ang) * A,
        y: t * DH,
        w: (2.2 + 10.5 * taper) * near,
        near: near,
        depth: depth
      });
    }
    // tangents and normals
    for(var j = 0; j <= N; j++){
      var p0 = samples[Math.max(0, j - 1)], p1 = samples[Math.min(N, j + 1)];
      var dx = p1.x - p0.x, dy = p1.y - p0.y;
      var len = Math.hypot(dx, dy) || 1;
      samples[j].tx = dx / len; samples[j].ty = dy / len;
      samples[j].nx = -dy / len; samples[j].ny = dx / len;
    }

    // only build path data for the slice of the coil that is on screen —
    // the SVG layer is one viewport tall, so the rest would never be painted
    var top = scrollY - 500, bottom = scrollY + innerHeight + 500;
    var kFrom = Math.max(0, Math.floor((top / DH) * N));
    var kTo = Math.min(N, Math.ceil((bottom / DH) * N));

    var left = '', right = [], scales = '', fins = '', legs = '';
    for(var k = kFrom; k <= kTo; k++){
      var s = samples[k];
      var lx = s.x + s.nx * s.w, ly = s.y + s.ny * s.w;
      var rx = s.x - s.nx * s.w, ry = s.y - s.ny * s.w;
      left += (k === kFrom ? 'M' : 'L') + lx.toFixed(1) + ' ' + ly.toFixed(1) + ' ';
      right.push('L' + rx.toFixed(1) + ' ' + ry.toFixed(1) + ' ');
      if(k % 3 === 0 && s.w > 2){
        scales += 'M' + lx.toFixed(1) + ' ' + ly.toFixed(1) + 'L' + rx.toFixed(1) + ' ' + ry.toFixed(1) + ' ';
      }
      // dorsal fin spikes on the near side of the coil
      if(k % 3 === 0 && s.depth > -0.35 && s.w > 3){
        var f = s.w * 0.85;
        var fx = s.x + s.nx * (s.w + f), fy = s.y + s.ny * (s.w + f);
        var ax = s.x + s.nx * s.w - s.tx * s.w * 0.9, ay = s.y + s.ny * s.w - s.ty * s.w * 0.9;
        var bx = s.x + s.nx * s.w + s.tx * s.w * 0.9, by = s.y + s.ny * s.w + s.ty * s.w * 0.9;
        fins += 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) +
                'L' + fx.toFixed(1) + ' ' + fy.toFixed(1) +
                'L' + bx.toFixed(1) + ' ' + by.toFixed(1) + 'Z ';
      }
    }
    // limbs, spaced along the body — only the ones currently on screen
    [0.16, 0.3, 0.44, 0.58, 0.72, 0.86].forEach(function(at){
      var ki = Math.round(at * N);
      if(ki < kFrom || ki > kTo) return;
      var s = samples[ki];
      if(!s || s.w < 4) return;
      var reach = s.w * 3.4, side = s.depth >= 0 ? 1 : -1;
      var hx = s.x + s.nx * s.w * side, hy = s.y + s.ny * s.w * side;
      var kx = hx + (s.nx * reach * side) + s.tx * reach * 0.5;
      var ky = hy + (s.ny * reach * side) + s.ty * reach * 0.5;
      var tx = kx + s.tx * reach * 0.7 - s.nx * reach * 0.2 * side;
      var ty = ky + s.ty * reach * 0.7 - s.ny * reach * 0.2 * side;
      legs += 'M' + hx.toFixed(1) + ' ' + hy.toFixed(1) +
              'Q' + kx.toFixed(1) + ' ' + ky.toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ' ';
      // claws
      legs += 'M' + tx.toFixed(1) + ' ' + ty.toFixed(1) + 'l' + (s.tx * 7).toFixed(1) + ' ' + (s.ty * 7).toFixed(1) + ' ';
      legs += 'M' + tx.toFixed(1) + ' ' + ty.toFixed(1) + 'l' + (s.nx * 6 * side).toFixed(1) + ' ' + (s.ny * 6 * side).toFixed(1) + ' ';
    });

    right.reverse();
    var bodyD = left + right.join("") + "Z";
    dgBody.setAttribute("d", bodyD);
    dgHalo.setAttribute("d", bodyD);
    dgScales.setAttribute('d', scales);
    dgFins.setAttribute('d', fins);
    dgLegs.setAttribute('d', legs);
  }

  function buildDragon(){
    if(!svg) return;
    DW = document.documentElement.clientWidth;
    DH = document.documentElement.scrollHeight;
    // layout can still be zero on the first frame; try again rather than
    // baking a 0×0 viewBox that nothing would ever correct
    if(DW < 2 || DH < 2){ requestAnimationFrame(buildDragon); return; }
    if(!dgBody) dragonInit();
    turns = Math.max(3, Math.min(11, DH / 680));
    N = Math.max(150, Math.min(260, Math.round(DH / 22)));
    panViewBox();
    geometry(phase);
    positionHead();
  }

  /* the layer stays one screen tall; the viewBox slides down with the scroll */
  function panViewBox(){
    svg.setAttribute('viewBox', '0 ' + Math.round(scrollY) + ' ' + DW + ' ' + innerHeight);
  }

  /* the head flies at mid-screen, the body trails up the page behind it */
  function positionHead(){
    if(!svg || !samples.length) return;
    var headY = scrollY + innerHeight * 0.5;
    var f = Math.max(0, Math.min(1, headY / DH));
    var s = samples[Math.min(N, Math.round(f * N))];
    var ang = Math.atan2(s.ty, s.tx) * 180 / Math.PI;
    var scale = 0.6 + 1.1 * s.near * (0.4 + 0.6 * (s.w / 13));
    dgHead.setAttribute('transform',
      'translate(' + s.x.toFixed(1) + ',' + s.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + scale.toFixed(2) + ')');
    dgClipRect.setAttribute('height', Math.max(0, s.y).toFixed(1));
  }

  /* slow flight: the coil keeps drifting even when the page is still */
  var driftLast = 0;
  function driftLoop(now){
    if(now - driftLast > 62){
      driftLast = now;
      phase += 0.016;
      geometry(phase);
      positionHead();
    }
    requestAnimationFrame(driftLoop);
  }

  /* ---------- scroll ---------- */
  var heroMedia = $('#heroMedia');
  var lastFrac = 0;
  function onScroll(){
    var max = document.documentElement.scrollHeight - innerHeight;
    lastFrac = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if(svg){
      panViewBox();
      if(reduceMotion || coarse){ geometry(phase); }   // no drift loop running
      positionHead();
    }
    if(!reduceMotion){
      if(heroMedia && scrollY < innerHeight * 1.3){
        heroMedia.style.transform = 'translate3d(0,' + (scrollY * 0.2) + 'px,0) scale(' + (1 + scrollY / innerHeight * 0.06) + ')';
      }
    }
    syncNav();
  }

  var resizeTimer;
  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){ buildDragon(); sizeRain(); onScroll(); }, 150);
  });
  buildDragon();
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ buildDragon(); onScroll(); }); }
  if(!reduceMotion && !coarse){ requestAnimationFrame(driftLoop); }
  onScroll();

  /* ---------- HUD clock ---------- */
  var hudTime = $('#hudTime');
  if(hudTime){
    var tick = function(){
      var d = new Date();
      hudTime.textContent = two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- hero rain ---------- */
  var canvas = $('#heroRain'), ctx = null, hero = null;
  var W = 0, H = 0, drops = [], motes = [];
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  function sizeRain(){
    if(!canvas) return;
    hero = hero || canvas.parentElement;
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W*DPR; canvas.height = H*DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    drops = [];
    var count = Math.round(W/9);
    for(var i=0;i<count;i++){
      drops.push({ x:Math.random()*W, y:Math.random()*H, len:8+Math.random()*16, v:5+Math.random()*7, o:.07+Math.random()*.18 });
    }
    motes = [];
    for(var j=0;j<24;j++){
      motes.push({ x:Math.random()*W, y:H*0.35 + Math.random()*H*0.6, r:.8+Math.random()*2.1, v:.12+Math.random()*.28, phase:Math.random()*10, warm:Math.random() > .45 });
    }
  }
  function drawRain(t){
    ctx.clearRect(0,0,W,H);
    ctx.lineWidth = 1;
    for(var i=0;i<drops.length;i++){
      var d = drops[i];
      d.y += d.v; d.x -= d.v*0.18;
      if(d.y > H){ d.y = -d.len; d.x = Math.random()*W; }
      if(d.x < -20){ d.x = W + 20; }
      ctx.strokeStyle = 'rgba(196,214,245,' + d.o + ')';
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len*0.18, d.y + d.len); ctx.stroke();
    }
    for(var j=0;j<motes.length;j++){
      var m = motes[j];
      m.y -= m.v; m.x += Math.sin(t/1600 + m.phase)*0.25;
      if(m.y < H*0.18){ m.y = H*0.98; m.x = Math.random()*W; }
      var col = m.warm ? '255,140,110' : '120,220,255';
      var g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r*7);
      g.addColorStop(0, 'rgba(' + col + ',.45)');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r*7, 0, Math.PI*2); ctx.fill();
    }
  }
  if(canvas){
    ctx = canvas.getContext('2d');
    sizeRain();
    if(reduceMotion){ canvas.style.display = 'none'; }
    else { (function rainLoop(t){ drawRain(t||0); requestAnimationFrame(rainLoop); })(); }
  }

  /* ---------- annotated plate (home) ---------- */
  var plate = $('#plateInner');
  if(plate && window.FC_PINS){
    var PINS = window.FC_PINS;
    var plateNav = $('#plateNav');
    var readIndex = $('#readIndex'), readGlyph = $('#readGlyph'), readTitle = $('#readTitle');
    var readCopy = $('#readCopy'), readAlt = $('#readAlt'), readSig = $('#readSig');
    var readLink = $('#readLink'), readPanel = $('#plateRead');
    var pinEls = [], navEls = [], activePin = 0;

    PINS.forEach(function(p, i){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pin';
      b.style.left = p.x + '%';
      b.style.top = p.y + '%';
      b.style.setProperty('--pin', p.hue);
      b.setAttribute('aria-label', p.title);
      b.textContent = two(i+1);
      b.addEventListener('mouseenter', function(){ setPin(i); });
      b.addEventListener('focus', function(){ setPin(i); });
      b.addEventListener('click', function(){ setPin(i); });
      plate.appendChild(b);
      pinEls.push(b);

      var n = document.createElement('button');
      n.type = 'button';
      n.textContent = two(i+1) + ' ' + p.title;
      n.addEventListener('click', function(){ setPin(i); });
      n.addEventListener('mouseenter', function(){ setPin(i); });
      plateNav.appendChild(n);
      navEls.push(n);
    });

    var setPin = function(i){
      var p = PINS[i];
      activePin = i;
      readIndex.textContent = two(i+1) + ' / ' + two(PINS.length);
      readGlyph.textContent = p.glyph;
      readTitle.textContent = p.title;
      readCopy.textContent = p.copy;
      readAlt.textContent = p.alt;
      readSig.textContent = p.sig;
      readPanel.style.setProperty('--pin', p.hue);
      readGlyph.classList.remove('pop'); void readGlyph.offsetWidth; readGlyph.classList.add('pop');
      readTitle.classList.remove('pop'); void readTitle.offsetWidth; readTitle.classList.add('pop');
      if(readLink){
        if(p.href){
          readLink.hidden = false;
          readLink.href = p.href;
          readLink.textContent = 'Open ' + p.linkName + ' →';
        } else {
          readLink.hidden = true;
        }
      }
      pinEls.forEach(function(el, k){ el.classList.toggle('is-active', k === i); });
      navEls.forEach(function(el, k){
        var on = (k === i);
        el.style.background = on ? p.hue : '';
        el.style.borderColor = on ? p.hue : '';
        el.style.color = on ? '#05060d' : '';
      });
    };
    setPin(0);

    document.addEventListener('keydown', function(e){
      if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var r = $('#atlas').getBoundingClientRect();
      if(r.top > innerHeight*0.7 || r.bottom < innerHeight*0.3) return;
      setPin((activePin + (e.key === 'ArrowRight' ? 1 : PINS.length - 1)) % PINS.length);
    });
  }

  /* ============================================================
     AMBIENT DEPTH LAYER
     Dust on the wind and water in the air, each particle carrying a z
     depth. Everything is projected with k = 1/z, so near things are
     bigger, faster, softer and more opaque — and they parallax against
     the scroll. Plus droplets that catch on the glass and run down it.
     ============================================================ */
  var amb = $('#ambient');
  if(amb && !reduceMotion){
    var ac = amb.getContext('2d');
    var aW = 0, aH = 0, aDPR = Math.min(1.75, window.devicePixelRatio || 1);
    var dust = [], drops = [], glass = [], solids = [];

    /* --- wireframe polyhedra, rotated properly in three axes --- */
    var SHAPES = {
      cube: {
        v: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
        e: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
      },
      octa: {
        v: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],
        e: [[0,2],[2,1],[1,3],[3,0],[0,4],[2,4],[1,4],[3,4],[0,5],[2,5],[1,5],[3,5]]
      },
      tetra: {
        v: [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],
        e: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]
      }
    };
    var SHAPE_KEYS = ['cube','octa','tetra'];

    function makeSolid(seeded){
      var z = rand(0.42, 1);
      return {
        shape: SHAPE_KEYS[(Math.random() * SHAPE_KEYS.length) | 0],
        x: rand(0, aW), y: seeded ? rand(0, aH) : rand(aH + 60, aH + 220),
        z: z,
        size: rand(16, 40) / z,
        rx: rand(0, 6.28), ry: rand(0, 6.28), rz: rand(0, 6.28),
        vx: rand(-0.12, 0.12), vy: rand(-0.5, -0.14),
        vrx: rand(-0.006, 0.006), vry: rand(-0.008, 0.008), vrz: rand(-0.004, 0.004),
        warm: Math.random() > 0.6
      };
    }

    function drawSolid(p){
      var s = SHAPES[p.shape];
      var cx = Math.cos(p.rx), sx = Math.sin(p.rx);
      var cy = Math.cos(p.ry), sy = Math.sin(p.ry);
      var cz = Math.cos(p.rz), sz = Math.sin(p.rz);
      var f = 420, pts = [], i, v, x, y, zz, t;
      for(i = 0; i < s.v.length; i++){
        v = s.v[i];
        x = v[0] * p.size; y = v[1] * p.size; zz = v[2] * p.size;
        // X, then Y, then Z
        t = y * cx - zz * sx; zz = y * sx + zz * cx; y = t;
        t = x * cy + zz * sy; zz = -x * sy + zz * cy; x = t;
        t = x * cz - y * sz; y = x * sz + y * cz; x = t;
        var k = f / (f + zz + p.size * 1.6);        // perspective divide
        pts.push([p.x + x * k, p.y + y * k, zz]);
      }
      var col = p.warm ? '245,190,140' : '150,215,255';
      var base = 0.05 + 0.2 * (1 - p.z);
      for(i = 0; i < s.e.length; i++){
        var a = pts[s.e[i][0]], b = pts[s.e[i][1]];
        // edges pointing away from the viewer sit further back and read fainter
        var depth = (a[2] + b[2]) / (2 * p.size);
        var alpha = base * (0.45 + 0.55 * ((depth + 1) / 2));
        ac.strokeStyle = 'rgba(' + col + ',' + alpha.toFixed(3) + ')';
        ac.lineWidth = Math.max(0.5, (1.5 / p.z) * 0.45 * (0.6 + 0.4 * ((depth + 1) / 2)));
        ac.beginPath(); ac.moveTo(a[0], a[1]); ac.lineTo(b[0], b[1]); ac.stroke();
      }
      // vertex sparks
      ac.fillStyle = 'rgba(' + col + ',' + (base * 1.5).toFixed(3) + ')';
      for(i = 0; i < pts.length; i++){
        ac.beginPath(); ac.arc(pts[i][0], pts[i][1], Math.max(0.7, 1.5 / p.z * 0.5), 0, Math.PI * 2); ac.fill();
      }
    }
    var wind = 0.25, windTarget = 0.25, windTimer = 0;
    var lastY = window.scrollY, aPrev = 0;
    var density = coarse ? 0.5 : 1;

    function rand(a, b){ return a + Math.random() * (b - a); }

    function makeDust(seeded){
      var z = rand(0.2, 1);
      return {
        x: rand(-40, aW + 40),
        y: seeded ? rand(0, aH) : rand(-30, aH + 30),
        z: z,
        r: rand(0.5, 2.1),
        ph: rand(0, Math.PI * 2),
        fall: rand(0.05, 0.28),
        warm: Math.random() > 0.55
      };
    }
    function makeDrop(seeded){
      var z = rand(0.25, 1);
      return {
        x: rand(-30, aW + 30),
        y: seeded ? rand(0, aH) : rand(-140, -10),
        z: z,
        len: rand(9, 26),
        sp: rand(5.5, 9)
      };
    }
    function makeGlass(){
      var r = rand(2.2, 7.5);
      return {
        x: rand(20, aW - 20), y: rand(60, aH - 80), r: r,
        vy: 0, held: rand(600, 4200), born: aPrev, life: rand(6000, 14000),
        trail: []
      };
    }

    function ambSize(){
      aW = window.innerWidth; aH = window.innerHeight;
      if(aW < 2 || aH < 2) return;
      amb.width = Math.round(aW * aDPR); amb.height = Math.round(aH * aDPR);
      amb.style.width = aW + 'px'; amb.style.height = aH + 'px';
      ac.setTransform(aDPR, 0, 0, aDPR, 0, 0);
      dust = [];
      var dn = Math.round(Math.min(160, (aW * aH) / 8600) * density);
      for(var i = 0; i < dn; i++){ dust.push(makeDust(true)); }
      drops = [];
      var rn = Math.round(Math.min(80, aW / 16) * density);
      for(var j = 0; j < rn; j++){ drops.push(makeDrop(true)); }
      glass = [];
      solids = [];
      var sn = coarse ? 3 : 7;
      for(var s = 0; s < sn; s++){ solids.push(makeSolid(true)); }
    }

    function ambDraw(t){
      var dt = Math.min(48, t - aPrev || 16);
      aPrev = t;
      ac.clearRect(0, 0, aW, aH);

      // gusts, and the parallax kick from scrolling
      windTimer -= dt;
      if(windTimer <= 0){ windTarget = rand(-0.9, 1.5); windTimer = rand(1800, 5200); }
      wind += (windTarget - wind) * 0.015;
      var dy = window.scrollY - lastY;
      lastY = window.scrollY;
      var shift = Math.max(-90, Math.min(90, dy));

      var i, p, k, a;

      /* --- dust: blown sideways, sinking slowly, parallaxed by depth --- */
      for(i = 0; i < dust.length; i++){
        p = dust[i];
        k = 1 / p.z;
        p.x += (wind * k * 0.55) + Math.sin(t * 0.0006 + p.ph) * 0.22 * k;
        p.y += p.fall * k * 0.5 - shift * (k - 0.6) * 0.05;
        if(p.x > aW + 50) p.x = -50; else if(p.x < -50) p.x = aW + 50;
        if(p.y > aH + 40){ p.y = -30; p.x = rand(-40, aW + 40); }
        else if(p.y < -60){ p.y = aH + 20; p.x = rand(-40, aW + 40); }

        var dr = p.r * k * 0.9;
        a = (0.055 + 0.16 * (1 - p.z)) * 0.9;
        var g = ac.createRadialGradient(p.x, p.y, 0, p.x, p.y, dr * 3.2);
        var col = p.warm ? '245,190,140' : '150,210,255';
        g.addColorStop(0, 'rgba(' + col + ',' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + col + ',0)');
        ac.fillStyle = g;
        ac.beginPath(); ac.arc(p.x, p.y, dr * 3.2, 0, Math.PI * 2); ac.fill();
      }

      /* --- water in the air: near streaks fall faster and read softer --- */
      for(i = 0; i < drops.length; i++){
        p = drops[i];
        k = 1 / p.z;
        p.y += p.sp * k * 0.55;
        p.x += wind * k * 0.35;
        if(p.y - p.len * k > aH + 20){ p.y = rand(-160, -20); p.x = rand(-30, aW + 30); }
        if(p.x > aW + 40) p.x = -40; else if(p.x < -40) p.x = aW + 40;

        var L = p.len * k * 0.7, slant = wind * k * 1.4;
        ac.strokeStyle = 'rgba(190,220,255,' + (0.05 + 0.16 * (1 - p.z)).toFixed(3) + ')';
        ac.lineWidth = Math.max(0.6, 1.5 * k * 0.55);
        ac.beginPath();
        ac.moveTo(p.x, p.y);
        ac.lineTo(p.x + slant, p.y + L);
        ac.stroke();
      }

      /* --- floating solids: drifting, tumbling, parallaxed by depth --- */
      for(i = 0; i < solids.length; i++){
        p = solids[i];
        k = 1 / p.z;
        p.rx += p.vrx; p.ry += p.vry; p.rz += p.vrz;
        p.x += p.vx * k + wind * k * 0.25;
        p.y += p.vy * k * 0.5 - shift * (k - 0.6) * 0.08;
        if(p.y < -160){ solids[i] = makeSolid(false); continue; }
        if(p.y > aH + 260){ p.y = -140; }
        if(p.x < -120) p.x = aW + 110; else if(p.x > aW + 120) p.x = -110;
        drawSolid(p);
      }

      /* --- droplets caught on the glass: they cling, then run down --- */
      if(glass.length < (coarse ? 5 : 11) && Math.random() < 0.02){ glass.push(makeGlass()); }
      for(i = glass.length - 1; i >= 0; i--){
        p = glass[i];
        p.held -= dt;
        if(p.held <= 0){
          p.vy += 0.014 * p.r;                       // heavier drops run sooner and faster
          p.y += p.vy;
          if(p.vy > 0.5){
            p.trail.push({ x: p.x, y: p.y, r: p.r * 0.42 });
            if(p.trail.length > 26) p.trail.shift();
          }
          p.r *= 0.9992;
        }
        p.life -= dt;
        if(p.y - p.r > aH || p.life <= 0 || p.r < 1.2){ glass.splice(i, 1); continue; }

        var fade = Math.min(1, p.life / 1200);
        // the wet track it leaves behind
        for(var q = 0; q < p.trail.length; q++){
          var tr = p.trail[q], ta = (q / p.trail.length) * 0.1 * fade;
          ac.fillStyle = 'rgba(175,215,255,' + ta.toFixed(3) + ')';
          ac.beginPath(); ac.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ac.fill();
        }
        // the lens itself: lit from the upper left, bright rim lower right
        var lg = ac.createRadialGradient(p.x - p.r * 0.38, p.y - p.r * 0.42, p.r * 0.08, p.x, p.y, p.r);
        lg.addColorStop(0, 'rgba(226,244,255,' + (0.5 * fade).toFixed(3) + ')');
        lg.addColorStop(0.45, 'rgba(130,180,230,' + (0.14 * fade).toFixed(3) + ')');
        lg.addColorStop(1, 'rgba(210,235,255,' + (0.05 * fade).toFixed(3) + ')');
        ac.fillStyle = lg;
        ac.beginPath(); ac.arc(p.x, p.y, p.r, 0, Math.PI * 2); ac.fill();
        ac.strokeStyle = 'rgba(235,248,255,' + (0.22 * fade).toFixed(3) + ')';
        ac.lineWidth = 0.8;
        ac.beginPath(); ac.arc(p.x, p.y, p.r * 0.94, Math.PI * 0.15, Math.PI * 0.85); ac.stroke();
      }
    }

    var ambRAF = null;
    function ambLoop(t){
      if(document.hidden){ ambRAF = null; return; }   // don't burn frames in a background tab
      ambDraw(t || 0);
      ambRAF = requestAnimationFrame(ambLoop);
    }
    document.addEventListener('visibilitychange', function(){
      if(!document.hidden && !ambRAF){ aPrev = performance.now(); ambRAF = requestAnimationFrame(ambLoop); }
    });
    var ambResize;
    window.addEventListener('resize', function(){
      clearTimeout(ambResize);
      ambResize = setTimeout(ambSize, 200);
    });
    ambSize();
    // keep retrying while layout reports nothing, so the field always seeds
    if(aW < 2){ (function retry(){ if(aW < 2){ ambSize(); requestAnimationFrame(retry); } })(); }
    aPrev = performance.now();
    ambRAF = requestAnimationFrame(ambLoop);
  }

  /* ---------- ambient audio, carried across pages ---------- */
  var audio = $('#track'), audioBtn = $('#audioBtn'), audioLabel = $('#audioLabel');
  if(audio && audioBtn){
    var KEY_ON = 'fc_audio_on', KEY_T = 'fc_audio_t', VOL = 0.55;
    var fadeTimer = null;
    audio.volume = 0;

    var store = function(k, v){ try{ sessionStorage.setItem(k, v); }catch(err){} };
    var read  = function(k){ try{ return sessionStorage.getItem(k); }catch(err){ return null; } };

    var fadeTo = function(target, after){
      clearInterval(fadeTimer);
      var step = (target - audio.volume) / 24;
      if(!step){ if(after) after(); return; }
      fadeTimer = setInterval(function(){
        audio.volume = Math.min(1, Math.max(0, audio.volume + step));
        if((step > 0 && audio.volume >= target - .02) || (step < 0 && audio.volume <= target + .02)){
          audio.volume = target; clearInterval(fadeTimer); if(after) after();
        }
      }, 40);
    };
    var setBtn = function(playing){
      audioBtn.classList.toggle('is-playing', playing);
      audioBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      audioLabel.textContent = playing ? 'Sound on' : 'Sound off';
    };
    var start = function(fromStorage){
      var at = parseFloat(read(KEY_T) || '0');
      if(at > 0 && isFinite(at)){ try{ audio.currentTime = at; }catch(err){} }
      var p = audio.play();
      if(p && p.then){
        p.then(function(){ setBtn(true); store(KEY_ON, '1'); fadeTo(VOL); })
         .catch(function(){
           store(KEY_ON, '0');
           setBtn(false);
           if(!fromStorage){ audioLabel.textContent = 'Audio blocked'; }
         });
      } else { setBtn(true); store(KEY_ON, '1'); fadeTo(VOL); }
    };

    audioBtn.addEventListener('click', function(){
      if(audio.paused){ start(false); }
      else {
        store(KEY_ON, '0');
        fadeTo(0, function(){ audio.pause(); setBtn(false); });
      }
    });

    setInterval(function(){ if(!audio.paused){ store(KEY_T, audio.currentTime); } }, 1000);
    window.addEventListener('pagehide', function(){ if(!audio.paused){ store(KEY_T, audio.currentTime); } });

    if(read(KEY_ON) === '1'){ start(true); }
  }
})();
