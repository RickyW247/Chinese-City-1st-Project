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
      '<em>灯</em> LANTERN GRID STEADY · 41,208 LIT',
      'WEATHER: <b>LIGHT RAIN</b> · VISIBILITY 18KM · BRING THE GOOD COAT',
      '<em>龙</em> DRAGON BROADCAST — UNBROKEN SINCE 2061'
    ];
    var row = lines.map(function(t){ return '<span>' + t + '</span>'; }).join('');
    track.innerHTML = row + row;
  }

  /* ---------- card spotlight, and the tilt that goes with it ---------- */
  /* The pointer drives both the highlight and a small rotation, so a card
     reads as a panel you are leaning rather than a rectangle lighting up. */
  function tiltable(el, maxDeg){
    if(reduceMotion || coarse) return;
    el.addEventListener('pointermove', function(e){
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;          // 0 … 1
      var py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      el.style.setProperty('--ry', ((px - .5) * 2 * maxDeg).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((.5 - py) * 2 * maxDeg).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', function(){
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  }
  $$('.card').forEach(function(c){ tiltable(c, 7); });
  $$('.pn').forEach(function(p){ tiltable(p, 4.5); });

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

  /* ---------- the makers' photo ----------
     Whoever drops the picture in should not have to care whether their
     phone called it .jpg, .jpeg or .png — try the lot, then own up. */
  $$('.makers-frame img').forEach(function(img){
    var alts = (img.getAttribute('data-alts') || '').split(',').filter(Boolean);
    img.addEventListener('error', function(){
      if(alts.length){ img.src = alts.shift().trim(); return; }
      var frame = img.closest('.makers-frame');
      if(frame) frame.classList.add('is-missing');
    });
    if(img.complete && img.naturalWidth === 0){ img.dispatchEvent(new Event('error')); }
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
  var DW = 0, DH = 0, turns = 4, N = 200, phase = 0;
  var samples = [];

  /* One dragon, drawn as a solid helix rather than a flat ribbon.
     Everything below exists to sell depth on a 2D layer:
       · the coil is an ellipse, not a sine wave — each loop leans toward
         the viewer (TILT), so the body genuinely passes in front of itself
       · the body is cut into quads and sorted into BANDS by depth, painted
         far band first, so near coils occlude far ones
       · colour, alpha, thickness and detail all ride on that same depth, so
         far coils go dark and hazy and near coils go bright and fat
       · a rim light runs along one edge only, from a fixed light direction */
  var BANDS = 10;
  var TILT = 0.34;                    // how far each loop leans out of the page
  var LX = -0.55, LY = -0.84;         // light, from the upper left
  var GIRTH = 1;                      // body scale, from the width of the page
  var band = [];                      // one set of paths per depth band
  var dgHead;

  /* ---- colour helpers: the palette is mixed from the page's own accents ---- */
  function rgbOf(c){
    c = (c || '').trim();
    if(c.charAt(0) === '#'){
      if(c.length === 4) return [parseInt(c[1]+c[1],16), parseInt(c[2]+c[2],16), parseInt(c[3]+c[3],16)];
      return [parseInt(c.substr(1,2),16), parseInt(c.substr(3,2),16), parseInt(c.substr(5,2),16)];
    }
    var m = c.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [77,232,255];
  }
  function mix(a, b, k){ return [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k]; }
  function rgba(c, a){
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a.toFixed(3) + ')';
  }
  function hex(c){
    return '#' + [0,1,2].map(function(i){ return ('0' + Math.round(c[i]).toString(16)).slice(-2); }).join('');
  }

  var PAL = null;
  function palette(){
    var A = rgbOf(cssVar('--accent', '#4de8ff'));
    var B = rgbOf(cssVar('--accent-2', '#9a6bff'));
    var G = rgbOf(cssVar('--gold', '#f0b45c'));
    var C = rgbOf(cssVar('--crimson', '#ff3d64'));
    var VOID = rgbOf(cssVar('--void', '#05060d'));
    var W = [255,255,255];
    var deep = mix(B, VOID, .42), mid = mix(A, B, .5), near = mix(A, W, .34);
    var p = { a:A, b:B, gold:G, crimson:C, dark:VOID, body:[], hi:[], sh:[], rim:[], glow:[], ring:[], plate:[], spine:[], limb:[] };
    for(var i = 0; i < BANDS; i++){
      var k = i / (BANDS - 1);                       // 0 far … 1 near
      var base = k < .5 ? mix(deep, mid, k * 2) : mix(mid, near, (k - .5) * 2);
      p.body.push(rgba(base, .48 + .46 * k));
      p.hi.push(rgba(mix(base, W, .48), .16 + .46 * k));      // lit flank
      p.sh.push(rgba(mix(base, VOID, .62), .30 + .40 * k));   // turning away
      p.rim.push(rgba(mix(base, W, .55 + .25 * k), .12 + .62 * k));
      p.glow.push(rgba(mix(base, W, .35), .04 + .13 * k));
      p.ring.push(rgba(W, .06 + .28 * k));
      p.plate.push(rgba(mix(base, W, .40), .08 + .34 * k));
      p.spine.push(rgba(mix(B, A, k), .22 + .50 * k));
      p.limb.push(rgba(mix(base, W, .3), .38 + .5 * k));
    }
    return p;
  }

  function headMarkup(p){
    var a = hex(p.a), b = hex(p.b), gold = hex(p.gold), crim = hex(p.crimson);
    var lit = hex(mix(p.a, [255,255,255], .45));
    var dark = hex(mix(p.b, p.dark, .55));
    return (
      /* mane, three layers deep so it reads as hair rather than a fringe */
'<g transform="scale(.82)">' +
      '<path d="M-6,-11 L-26,-22 L-14,-8 L-32,-9 L-15,-2 L-31,6 L-14,4 L-24,18 L-6,10 Z" fill="' + dark + '" opacity=".75"/>' +
      '<path d="M-5,-10 L-20,-18 L-11,-7 L-25,-6 L-12,-1 L-24,7 L-11,5 L-18,15 L-5,9 Z" fill="' + b + '" opacity=".8"/>' +
      '<path d="M-4,-8 L-14,-13 L-8,-5 L-17,-3 L-8,1 L-15,8 L-4,7 Z" fill="' + lit + '" opacity=".4"/>' +
      '</g>' +
      /* neck plates, so the head does not start at a hard edge */
      '<path d="M-10,-7 C-4,-9 -2,-9 1,-8 L1,8 C-2,9 -4,9 -10,7 Z" fill="' + dark + '" opacity=".75"/>' +
      /* skull, then a lit top plane and a shadowed under plane — a cylinder, not a disc */
      '<path d="M-6,-10 C6,-13 20,-8 27,0 C20,8 6,13 -6,10 C-10,5 -10,-5 -6,-10 Z" fill="' + a + '" opacity=".95"/>' +
      '<path d="M-6,-10 C6,-13 20,-8 27,0 C18,-2 6,-4 -5,-4 C-7,-7 -7,-8 -6,-10 Z" fill="' + lit + '" opacity=".55"/>' +
      '<path d="M-6,10 C6,13 20,8 27,0 C18,3 8,6 -4,6 C-6,8 -6,9 -6,10 Z" fill="' + dark + '" opacity=".6"/>' +
      /* brow ridge and cheek plate */
      '<path d="M-2,-6 C6,-8 13,-6 18,-2" fill="none" stroke="' + dark + '" stroke-width="1.6" opacity=".8"/>' +
      '<path d="M-1,2 C5,3 10,3 15,2" fill="none" stroke="' + dark + '" stroke-width="1.2" opacity=".55"/>' +
      /* jaw, open, with teeth */
      '<path d="M9,4 C16,9 23,8 27,1 C22,7 15,7 9,4 Z" fill="' + dark + '" opacity=".9"/>' +
      '<path d="M13,3.4 l1.4,2.6 l1.3,-2.4 Z M17.6,4.2 l1.4,2.6 l1.3,-2.5 Z M22,4 l1.2,2.2 l1.3,-2.1 Z" fill="#ffffff" opacity=".85"/>' +
      '<path d="M11,-3 l1.4,-2.8 l1.4,2.6 Z M16,-3 l1.4,-2.8 l1.4,2.6 Z" fill="#ffffff" opacity=".55"/>' +
      /* horns — a main pair swept back, a smaller branch on each */
      '<path d="M-2,-8 C-10,-16 -18,-22 -30,-27" fill="none" stroke="' + a + '" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M-14,-18 C-18,-22 -22,-24 -28,-25" fill="none" stroke="' + a + '" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M3,-8 C-2,-15 -7,-20 -15,-25" fill="none" stroke="' + lit + '" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M-6,-15 C-10,-18 -13,-19 -18,-20" fill="none" stroke="' + lit + '" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>' +
      /* whiskers, long and curling — the giveaway of a Chinese dragon */
      '<path d="M23,-3 C34,-9 42,-19 39,-31 C38,-36 34,-38 31,-36" fill="none" stroke="' + b + '" stroke-width="2" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M23,4 C33,7 42,14 44,26 C45,31 42,34 38,33" fill="none" stroke="' + b + '" stroke-width="2" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M20,-5 C27,-11 31,-17 30,-24" fill="none" stroke="' + gold + '" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>' +
      /* nostril, eye, spark */
      '<circle cx="23" cy="-1.5" r="1.3" fill="' + dark + '" opacity=".9"/>' +
      '<ellipse cx="8" cy="-4" rx="4.2" ry="3.4" fill="#ffffff" opacity=".92"/>' +
      '<ellipse cx="8.8" cy="-4" rx="1.7" ry="2.9" fill="' + crim + '"/>' +
      '<circle cx="7" cy="-5.2" r="1" fill="#ffffff"/>' +
      '<circle cx="30" cy="0" r="2.6" fill="' + gold + '" opacity=".55"/>'
    );
  }

  function dragonInit(){
    if(!svg) return;
    PAL = palette();
    var layers = '';
    band = [];
    for(var i = 0; i < BANDS; i++){
      // far bands first: this list order IS the depth sorting
      layers +=
        '<g id="dgB' + i + '" shape-rendering="optimizeSpeed">' +
          '<path class="dgAo"    fill="' + rgba(PAL.dark, .9) + '"/>' +
          '<path class="dgBody"  fill="' + PAL.body[i] + '"/>' +
          '<path class="dgSh"    fill="' + PAL.sh[i] + '"/>' +
          '<path class="dgHi"    fill="' + PAL.hi[i] + '"/>' +
          '<path class="dgPlate" fill="' + PAL.plate[i] + '"/>' +
          '<path class="dgSpine" fill="' + PAL.spine[i] + '"/>' +
          '<path class="dgRing"  fill="none" stroke="' + PAL.ring[i] + '" stroke-width="1"/>' +
          '<path class="dgGlow"  fill="none" stroke="' + PAL.glow[i] + '" stroke-linecap="round"/>' +
          '<path class="dgRim"   fill="none" stroke="' + PAL.rim[i] + '" stroke-linecap="round"/>' +
          '<path class="dgLimb"  fill="none" stroke="' + PAL.limb[i] + '" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</g>';
    }
    svg.innerHTML =
      '<g>' + layers + '</g>' +
      '<g class="dg-head" id="dgHead"></g>';
    for(var j = 0; j < BANDS; j++){
      var g = $('#dgB' + j);
      band.push({
        group: g,
        ao:    g.querySelector('.dgAo'),
        body:  g.querySelector('.dgBody'),
        sh:    g.querySelector('.dgSh'),
        hi:    g.querySelector('.dgHi'),
        plate: g.querySelector('.dgPlate'),
        spine: g.querySelector('.dgSpine'),
        ring:  g.querySelector('.dgRing'),
        rim:   g.querySelector('.dgRim'),
        glow:  g.querySelector('.dgGlow'),
        limb:  g.querySelector('.dgLimb')
      });
    }
    dgHead = $('#dgHead');
    dgHead.innerHTML = headMarkup(PAL);
  }

  function headFrac(){
    return Math.max(0, Math.min(1, (scrollY + innerHeight * 0.76) / DH));
  }

  function geometry(ph){
    samples = [];
    var cxp = DW / 2;
    var amp = Math.min(DW * 0.40, 560);
    GIRTH = Math.max(0.8, Math.min(1.7, DW / 1150));
    for(var i = 0; i <= N; i++){
      var t = i / N;
      var ang = t * turns * Math.PI * 2 + ph;
      var taper = Math.sin(Math.min(t * 7, 1) * Math.PI / 2) * Math.sin(Math.min((1 - t) * 6, 1) * Math.PI / 2);
      var A = amp * (0.46 + 0.54 * taper);
      var depth = Math.cos(ang);                        // +1 near, −1 far
      var near = 0.34 + 0.66 * (depth * 0.5 + 0.5);     // strong foreshortening
      samples.push({
        x: cxp + Math.sin(ang) * A,
        y: t * DH + depth * A * TILT,                   // the lean that makes it a helix
        w: (12 + 40 * taper) * near * GIRTH,
        w0: (12 + 40 * taper) * near * GIRTH,   // girth before the neck thins it
        near: near,
        depth: depth
      });
    }
    for(var j = 0; j <= N; j++){
      var p0 = samples[Math.max(0, j - 1)], p1 = samples[Math.min(N, j + 1)];
      var dx = p1.x - p0.x, dy = p1.y - p0.y;
      var len = Math.hypot(dx, dy) || 1;
      samples[j].tx = dx / len; samples[j].ty = dy / len;
      samples[j].nx = -dy / len; samples[j].ny = dx / len;
      // which edge the light falls on, and how squarely
      var d = samples[j].nx * LX + samples[j].ny * LY;
      samples[j].lit = d >= 0 ? 1 : -1;
      samples[j].facing = Math.abs(d);
    }

    // only build the slice of the coil that is on screen — the layer is one
    // viewport tall, so the rest would never be painted. The lean pushes a
    // loop up to amp*TILT off its nominal y, so the margin has to cover it.
    var margin = 500 + Math.min(DW * 0.40, 560) * TILT;
    var kFrom = Math.max(0, Math.floor(((scrollY - margin) / DH) * N));
    var kTo = Math.min(N - 1, Math.ceil(((scrollY + innerHeight + margin) / DH) * N));
    // The neck runs into the head rather than up to it. Tapering only to 55%
    // left a full slab of body sitting exactly where the face is, and once the
    // depth rounding put that slab a band nearer than the head it painted
    // straight over the muzzle. Taper it to nothing instead: the head's own
    // artwork covers the join, and there is no longer anything there to cross.
    var kHead = Math.min(N, Math.round(headFrac() * N));
    kTo = Math.min(kTo, kHead);
    var NECK = 7;
    for(var n2 = Math.max(0, kHead - NECK); n2 <= kHead && n2 <= N; n2++){
      var g2 = (kHead - n2) / NECK;                   // 0 at the head, 1 back along the body
      samples[n2].w *= g2 * g2 * (3 - 2 * g2);        // smooth, and truly zero at the head
    }

    var ao = [], body = [], hi = [], sh = [], plate = [], spine = [], ring = [], rim = [], limb = [];
    for(var q = 0; q < BANDS; q++){ ao[q] = ''; body[q] = ''; hi[q] = ''; sh[q] = ''; plate[q] = ''; spine[q] = ''; ring[q] = ''; rim[q] = ''; limb[q] = ''; }

    function edge(s, side, k){
      return [s.x + s.nx * s.w * k * side, s.y + s.ny * s.w * k * side];
    }
    // a band running down one flank of the body, between two offsets from
    // its centre line — this is what shades the tube round
    function strip(s, e, side, k0, k1){
      var a = edge(s, side, k0), b = edge(e, side, k0), c = edge(e, side, k1), d = edge(s, side, k1);
      return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) +
             'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) +
             'L' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) +
             'L' + d[0].toFixed(1) + ' ' + d[1].toFixed(1) + 'Z ';
    }
    function quad(s, e, k){
      var a = edge(s, 1, k), b = edge(e, 1, k), c = edge(e, -1, k), d = edge(s, -1, k);
      return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) +
             'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) +
             'L' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) +
             'L' + d[0].toFixed(1) + ' ' + d[1].toFixed(1) + 'Z ';
    }

    for(var k = kFrom; k <= kTo; k++){
      var s = samples[k], e = samples[k + 1];
      if(!e) break;
      var dep = (s.depth + e.depth) / 2;
      var bi = Math.max(0, Math.min(BANDS - 1, Math.round((dep + 1) / 2 * (BANDS - 1))));

      body[bi] += quad(s, e, 1.02);                     // slight overlap hides the seams
      if(s.w > 2.5){
        sh[bi] += strip(s, e, -s.lit, .35, 1.02);       // flank turning away from the light
        hi[bi] += strip(s, e, s.lit, .05, .66);         // flank facing it
      }
      // the nearest coils carry a dark skirt, so where the body crosses itself
      // the far coil is cut by a shadow instead of dissolving into it
      if(bi >= BANDS - 3) ao[bi] += quad(s, e, 1.5);

      // rim light down the lit edge only
      if(s.w > 2){
        var r0 = edge(s, s.lit, .86), r1 = edge(e, e.lit, .86);
        rim[bi] += 'M' + r0[0].toFixed(1) + ' ' + r0[1].toFixed(1) +
                   'L' + r1[0].toFixed(1) + ' ' + r1[1].toFixed(1) + ' ';
      }
      // scale rings: arcs, bowing the way the body turns away from the eye
      if(k % 2 === 0 && s.w > 3){
        var g0 = edge(s, 1, 1), g1 = edge(s, -1, 1);
        ring[bi] += 'M' + g0[0].toFixed(1) + ' ' + g0[1].toFixed(1) +
                    'A' + (s.w * 1.5).toFixed(1) + ' ' + (s.w * 1.5).toFixed(1) + ' 0 0 ' +
                    (s.depth >= 0 ? '1' : '0') + ' ' + g1[0].toFixed(1) + ' ' + g1[1].toFixed(1) + ' ';
      }
      // belly scutes, on the shaded edge, only where the underside shows
      if(k % 2 === 0 && s.w > 4 && s.depth > -0.45){
        var u = -1;                                      // the belly stays underneath
        var b0 = edge(s, u, .55), b1 = edge(s, u, 1.0);
        var b2 = edge(e, u, 1.0), b3 = edge(e, u, .55);
        plate[bi] += 'M' + b0[0].toFixed(1) + ' ' + b0[1].toFixed(1) +
                     'L' + b1[0].toFixed(1) + ' ' + b1[1].toFixed(1) +
                     'L' + b2[0].toFixed(1) + ' ' + b2[1].toFixed(1) +
                     'L' + b3[0].toFixed(1) + ' ' + b3[1].toFixed(1) + 'Z ';
      }
      // dorsal crest along the back, taller on the near side, serrated
      if(k % 2 === 0 && s.w > 3.4 && s.depth > -0.5){
        var h = s.w * (k % 4 === 0 ? 1.15 : 0.7) * (0.55 + 0.45 * s.near);
        var side = 1;                                    // the crest stays on the back
        var tip = [s.x + s.nx * (s.w + h) * side, s.y + s.ny * (s.w + h) * side];
        var f0 = [s.x + s.nx * s.w * side - s.tx * s.w * 0.85, s.y + s.ny * s.w * side - s.ty * s.w * 0.85];
        var f1 = [s.x + s.nx * s.w * side + s.tx * s.w * 0.85, s.y + s.ny * s.w * side + s.ty * s.w * 0.85];
        var bend = [tip[0] - s.tx * h * .45, tip[1] - s.ty * h * .45];   // swept back
        spine[bi] += 'M' + f0[0].toFixed(1) + ' ' + f0[1].toFixed(1) +
                     'Q' + (f0[0] + s.nx * h * .5 * side).toFixed(1) + ' ' + (f0[1] + s.ny * h * .5 * side).toFixed(1) + ' ' +
                     bend[0].toFixed(1) + ' ' + bend[1].toFixed(1) +
                     'L' + f1[0].toFixed(1) + ' ' + f1[1].toFixed(1) + 'Z ';
      }
    }

    // the tail ends in a fin rather than a stump
    if(kFrom <= 3){
      var s0 = samples[0], b0 = Math.max(0, Math.min(BANDS - 1, Math.round((s0.depth + 1) / 2 * (BANDS - 1))));
      var fw = Math.max(6, s0.w * 2.4), fl = Math.max(26, s0.w * 9);
      spine[b0] += 'M' + (s0.x + s0.nx * fw).toFixed(1) + ' ' + (s0.y + s0.ny * fw).toFixed(1) +
                   'Q' + (s0.x - s0.tx * fl * .6 + s0.nx * fw * 1.6).toFixed(1) + ' ' + (s0.y - s0.ty * fl * .6 + s0.ny * fw * 1.6).toFixed(1) + ' ' +
                   (s0.x - s0.tx * fl).toFixed(1) + ' ' + (s0.y - s0.ty * fl).toFixed(1) +
                   'Q' + (s0.x - s0.tx * fl * .6 - s0.nx * fw * 1.6).toFixed(1) + ' ' + (s0.y - s0.ty * fl * .6 - s0.ny * fw * 1.6).toFixed(1) + ' ' +
                   (s0.x - s0.nx * fw).toFixed(1) + ' ' + (s0.y - s0.ny * fw).toFixed(1) + 'Z ';
    }

    // legs, jointed and clawed, and only drawn where they would be seen
    [0.12, 0.23, 0.34, 0.45, 0.56, 0.67, 0.78, 0.89].forEach(function(at){
      var ki = Math.round(at * N);
      if(ki < kFrom || ki > kTo) return;
      var s = samples[ki];
      if(!s || s.w < 5) return;
      var bi2 = Math.max(0, Math.min(BANDS - 1, Math.round((s.depth + 1) / 2 * (BANDS - 1))));
      var reach = s.w * 2.6, side = s.depth >= 0 ? 1 : -1;
      var sx = s.x + s.nx * s.w * .9 * side, sy = s.y + s.ny * s.w * .9 * side;
      var ex = sx + s.nx * reach * side + s.tx * reach * .55;      // elbow
      var ey = sy + s.ny * reach * side + s.ty * reach * .55;
      var wx = ex + s.tx * reach * .95 - s.nx * reach * .25 * side; // wrist
      var wy = ey + s.ty * reach * .95 - s.ny * reach * .25 * side;
      limb[bi2] += 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) +
                   'Q' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' ' + wx.toFixed(1) + ' ' + wy.toFixed(1) + ' ';
      var claw = s.w * .95;
      [-0.55, 0, 0.55].forEach(function(sp){
        var cx2 = wx + (s.tx * Math.cos(sp) - s.ty * Math.sin(sp)) * claw;
        var cy2 = wy + (s.ty * Math.cos(sp) + s.tx * Math.sin(sp)) * claw;
        limb[bi2] += 'M' + wx.toFixed(1) + ' ' + wy.toFixed(1) + 'L' + cx2.toFixed(1) + ' ' + cy2.toFixed(1) + ' ';
      });
      // shoulder joint, so the leg grows out of the body instead of touching it
      limb[bi2] += 'M' + (sx - s.tx * s.w * .5).toFixed(1) + ' ' + (sy - s.ty * s.w * .5).toFixed(1) +
                   'A' + (s.w * .5).toFixed(1) + ' ' + (s.w * .5).toFixed(1) + ' 0 0 1 ' +
                   (sx + s.tx * s.w * .5).toFixed(1) + ' ' + (sy + s.ty * s.w * .5).toFixed(1) + ' ';
    });

    for(var m = 0; m < BANDS; m++){
      var t2 = band[m];
      t2.ao.setAttribute('d', ao[m]);
      t2.body.setAttribute('d', body[m]);
      t2.sh.setAttribute('d', sh[m]);
      t2.hi.setAttribute('d', hi[m]);
      t2.plate.setAttribute('d', plate[m]);
      t2.spine.setAttribute('d', spine[m]);
      t2.ring.setAttribute('d', ring[m]);
      t2.rim.setAttribute('d', rim[m]);
      t2.glow.setAttribute('d', rim[m]);
      t2.glow.setAttribute('stroke-width', (6 + 16 * (m / (BANDS - 1))).toFixed(1));
      t2.rim.setAttribute('stroke-width', (1.2 + 2.6 * (m / (BANDS - 1))).toFixed(1));
      t2.limb.setAttribute('d', limb[m]);
      t2.limb.setAttribute('stroke-width', ((2.2 + 4.4 * (m / (BANDS - 1))) * GIRTH).toFixed(1));
    }
  }

  function buildDragon(){
    if(!svg) return;
    DW = document.documentElement.clientWidth;
    DH = document.documentElement.scrollHeight;
    // layout can still be zero on the first frame; try again rather than
    // baking a 0×0 viewBox that nothing would ever correct
    if(DW < 2 || DH < 2){ requestAnimationFrame(buildDragon); return; }
    if(!band.length) dragonInit();
    // fewer, far wider coils than a thin ribbon would take — one animal
    // filling the page rather than a spring wound down it
    turns = Math.max(3, Math.min(12, DH / 640));
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
    // sample the coil continuously — rounding to the nearest sample made the
    // head hop a step at a time as the page scrolled
    var fi = Math.max(0, Math.min(N, headFrac() * N));
    var i0 = Math.min(N - 1, Math.floor(fi)), u = fi - i0;
    var s0 = samples[i0], s1 = samples[i0 + 1] || s0;
    var lerp = function(a, b){ return a + (b - a) * u; };
    var x = lerp(s0.x, s1.x), y = lerp(s0.y, s1.y);
    var tx = lerp(s0.tx, s1.tx), ty = lerp(s0.ty, s1.ty);
    var depth = lerp(s0.depth, s1.depth);
    var girth = lerp(s0.w0 || s0.w, s1.w0 || s1.w);
    var ang = Math.atan2(ty, tx) * 180 / Math.PI;
    var scale = Math.max(1.2, Math.min(3.4, girth / 12));
    // an animal doesn't swim on its back: when the coil carries the head off
    // to the left, mirror it along its own spine instead of letting the
    // rotation roll it over, so the mane and the eye stay on top
    var roll = (ang > 90 || ang < -90) ? -1 : 1;
    dgHead.setAttribute('transform',
      'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')' +
      ' scale(' + scale.toFixed(2) + ',' + (scale * roll).toFixed(2) + ')');

    // The head sits at its own depth, so a coil that genuinely loops round in
    // front of it still passes over — an animal wound through itself has to
    // hide its own head sometimes, or it stops reading as one body. What must
    // never happen is the neck painting over the face, and that is dealt with
    // where the body is built: the last stretch now tapers to nothing, so
    // there is no slab of neck left at the muzzle to be ordered against.
    var near = (depth + 1) / 2;
    var bi = Math.max(0, Math.min(BANDS - 1, Math.round(near * (BANDS - 1))));
    if(dgHead.parentNode !== band[bi].group){ band[bi].group.appendChild(dgHead); }
    dgHead.setAttribute('opacity', (0.5 + 0.5 * near).toFixed(3));
  }

  /* slow flight: the coil keeps drifting even when the page is still */
  var driftLast = 0;
  /* A phone was the reason this was ever rationed, but the test used to be
     `pointer:coarse` — which is every touch device — so tablets lost the
     dragon's flight altogether despite drawing it comfortably. Ration the
     frames instead of withholding them: a small screen gets a longer gap
     between rebuilds, anything larger gets the full rate. Rotation cannot
     change the answer, since the short side is the short side either way. */
  var DRIFT_GAP = (coarse && Math.min(innerWidth, innerHeight) < 600) ? 52 : 26;
  function driftLoop(now){
    if(!driftLast){ driftLast = now; }
    var dt = now - driftLast;
    if(dt >= DRIFT_GAP){
      driftLast = now;
      phase += 0.00021 * Math.min(90, dt);        // time-based, not per-tick
      geometry(phase);
      positionHead();
    }
    requestAnimationFrame(driftLoop);
  }

  /* scrolling changes which slice of the coil is on screen, so rebuild —
     once per frame at most, however many scroll events arrive */
  var scrollPending = false;
  function scrollRebuild(){
    scrollPending = false;
    panViewBox();
    geometry(phase);
    positionHead();
  }

  /* ---------- scroll ---------- */
  var heroMedia = $('#heroMedia');
  var lastFrac = 0;
  function onScroll(){
    var max = document.documentElement.scrollHeight - innerHeight;
    lastFrac = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if(svg){
      panViewBox();
      if(!scrollPending){ scrollPending = true; requestAnimationFrame(scrollRebuild); }
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
  if(!reduceMotion){ requestAnimationFrame(driftLoop); }
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
      drops.push({ x:Math.random()*W, y:Math.random()*H, len:16+Math.random()*30, v:6+Math.random()*8,
                   o:.10+Math.random()*.26, w:1+Math.random()*1.6 });
    }
    motes = [];
    for(var j=0;j<24;j++){
      motes.push({ x:Math.random()*W, y:H*0.35 + Math.random()*H*0.6, r:.8+Math.random()*2.1, v:.12+Math.random()*.28, phase:Math.random()*10, warm:Math.random() > .45 });
    }
  }
  function drawRain(t){
    ctx.clearRect(0,0,W,H);
    ctx.lineCap = 'round';
    for(var i=0;i<drops.length;i++){
      var d = drops[i];
      d.y += d.v; d.x -= d.v*0.18;
      if(d.y > H){ d.y = -d.len; d.x = Math.random()*W; }
      if(d.x < -20){ d.x = W + 20; }
      // a streak that thins upward, with a bright bead at the leading end
      ctx.lineWidth = d.w;
      ctx.strokeStyle = 'rgba(196,214,245,' + d.o.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len*0.18, d.y + d.len); ctx.stroke();
      ctx.fillStyle = 'rgba(228,240,255,' + (d.o * 1.5).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.x - d.len*0.18, d.y + d.len, d.w * 0.85, 0, Math.PI*2); ctx.fill();
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
    var dust = [], airDrops = [], glass = [], solids = [], sparks = [], foreDrops = [];

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

    /* The storm. Most strikes are somewhere behind the ridge — a sheet of
       light with no shape to it. Some are close enough to draw. */
    var storm = { wait: 2600, t: 0, flashes: [], bolt: null };
    var lastFlash = 0;
    var flashEl = null;
    function makeBolt(){
      var x = rand(aW * 0.1, aW * 0.9), y = -30;
      var main = [[x, y]];
      var segs = 9 + (Math.random() * 7 | 0);
      var reach = aH * rand(0.5, 1.0);
      for(var i = 1; i <= segs; i++){
        x += rand(-aW * 0.055, aW * 0.055);
        y += reach / segs;
        main.push([x, y]);
      }
      var branches = [];
      var nb = 1 + (Math.random() * 3 | 0);
      for(var b = 0; b < nb; b++){
        var from = main[3 + ((Math.random() * (main.length - 5)) | 0)];
        var bx = from[0], by = from[1], pts = [[bx, by]];
        var steps = 3 + (Math.random() * 3 | 0);
        for(var j = 0; j < steps; j++){
          bx += rand(-70, 70); by += rand(26, 74);
          pts.push([bx, by]);
        }
        branches.push(pts);
      }
      return { main: main, branches: branches };
    }
    function strike(){
      var close = Math.random() < 0.42;
      storm.bolt = close ? makeBolt() : null;
      storm.flashes = [];
      var n = 2 + (Math.random() * 3 | 0), at = 0;
      for(var i = 0; i < n; i++){
        at += rand(45, 200);
        storm.flashes.push({
          at: at,
          dur: rand(110, 340),
          peak: (close ? rand(0.24, 0.42) : rand(0.07, 0.17)) * (i ? rand(0.35, 0.85) : 1)
        });
      }
      storm.t = 0;
      storm.wait = rand(6500, 22000);
    }
    function strokeBolt(pts, w, col){
      ac.strokeStyle = col; ac.lineWidth = w; ac.lineCap = 'round'; ac.lineJoin = 'round';
      ac.beginPath(); ac.moveTo(pts[0][0], pts[0][1]);
      for(var i = 1; i < pts.length; i++){ ac.lineTo(pts[i][0], pts[i][1]); }
      ac.stroke();
    }
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
    /* glow dust: it hangs in the air, twinkling, until the page moves —
       then it lifts against the scroll and burns brighter for a moment */
    var SPARK_COL = [], energy = 0;
    function sparkPalette(){
      var a = rgbOf(cssVar('--accent', '#4de8ff'));
      var g = rgbOf(cssVar('--gold', '#f0b45c'));
      SPARK_COL = [
        a[0] + ',' + a[1] + ',' + a[2],
        g[0] + ',' + g[1] + ',' + g[2],
        '226,240,255'
      ];
    }
    function makeSpark(seeded){
      var z = rand(0.22, 1);
      return {
        x: rand(-30, aW + 30),
        y: seeded ? rand(0, aH) : rand(aH + 20, aH + 200),
        z: z,
        r: rand(0.7, 2.6),
        ph: rand(0, Math.PI * 2),
        tw: rand(0.0016, 0.0055),
        drift: rand(0.04, 0.22),
        col: SPARK_COL[(Math.random() * 3) | 0]
      };
    }
    function makeForeDrop(seeded){
      return {
        x: rand(-60, aW + 60),
        y: seeded ? rand(-aH, aH) : rand(-aH * 0.7, -60),
        len: rand(90, 230),
        w: rand(3.5, 8),
        sp: rand(26, 46),
        a: rand(0.05, 0.13)
      };
    }
    /* The moon sits furthest back of anything here. It is drawn once into
       its own little canvas — disc, seas, craters, phase — because the seas
       have to be punched OUT of the light rather than painted on top of it:
       the whole ambient layer is additive, so there is no such thing as a
       dark brushstroke. Every frame that sprite is stamped down, with the
       night's cloud dragged across it the same way. */
    var moon = { base:null, cvs:null, ctx:null, r:0, size:0, clouds:[], seed:Math.random() * 1000 };
    function punch(g, x, y, r, a){
      var pg = g.createRadialGradient(x, y, 0, x, y, r);
      pg.addColorStop(0, 'rgba(0,0,0,' + a + ')');
      pg.addColorStop(0.62, 'rgba(0,0,0,' + (a * 0.72) + ')');
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = pg;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    function buildMoon(){
      var r = Math.max(38, Math.min(104, Math.min(aW, aH) * 0.082));
      var size = Math.ceil(r * 2.6);
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var g = c.getContext('2d');
      var cx = size / 2, cy = size / 2;

      // the lit face — brightest toward the upper left, falling away round the limb
      var disc = g.createRadialGradient(cx - r * 0.34, cy - r * 0.36, r * 0.12, cx, cy, r);
      disc.addColorStop(0, 'rgba(255,253,246,0.97)');
      disc.addColorStop(0.5, 'rgba(228,235,250,0.88)');
      disc.addColorStop(0.86, 'rgba(176,192,226,0.72)');
      disc.addColorStop(1, 'rgba(138,158,200,0.5)');
      g.fillStyle = disc;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();

      // seas and craters, taken out of the light
      g.globalCompositeOperation = 'destination-out';
      var seas = [[-.30,-.20,.31,.20],[.18,-.33,.22,.17],[.28,.20,.27,.15],
                  [-.24,.32,.19,.13],[.02,.05,.16,.10],[-.05,-.42,.14,.11]];
      for(var i = 0; i < seas.length; i++){
        punch(g, cx + seas[i][0] * r, cy + seas[i][1] * r, seas[i][2] * r, seas[i][3]);
      }
      for(var j = 0; j < 14; j++){
        var ang = (j * 2.399 + moon.seed) % (Math.PI * 2);
        var rad = Math.sqrt(((j * 0.137 + moon.seed) % 1)) * r * 0.88;
        punch(g, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad,
              r * (0.03 + ((j * 0.211 + moon.seed) % 1) * 0.06), 0.16);
      }
      // the terminator: a gibbous bite out of the lower right
      var ph = g.createRadialGradient(cx + r * 0.92, cy + r * 0.5, r * 0.15,
                                      cx + r * 0.92, cy + r * 0.5, r * 1.25);
      ph.addColorStop(0, 'rgba(0,0,0,0.92)');
      ph.addColorStop(0.55, 'rgba(0,0,0,0.55)');
      ph.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = ph;
      g.beginPath(); g.arc(cx + r * 0.92, cy + r * 0.5, r * 1.25, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';

      // a cold rim on the lit edge, so the sphere has an edge to it
      g.strokeStyle = 'rgba(226,240,255,0.5)'; g.lineWidth = Math.max(1, r * 0.03);
      g.beginPath(); g.arc(cx, cy, r * 0.985, Math.PI * 0.72, Math.PI * 1.72); g.stroke();

      moon.base = c; moon.r = r; moon.size = size;
      moon.cvs = document.createElement('canvas');
      moon.cvs.width = moon.cvs.height = size;
      moon.ctx = moon.cvs.getContext('2d');

      // the cloud that keeps crossing it
      moon.clouds = [];
      for(var q = 0; q < 5; q++){
        moon.clouds.push({
          x: rand(-size * 0.6, size * 1.6),
          y: rand(size * 0.18, size * 0.82),
          r: rand(size * 0.22, size * 0.55),
          sp: rand(0.05, 0.22),
          a: rand(0.35, 0.85)
        });
      }
    }

    function drawMoon(t, dt, flash){
      if(!moon.base) return;
      var mx = aW * 0.78 + Math.sin(t * 0.00002) * 10;
      var my = aH * 0.21 - Math.min(150, window.scrollY * 0.035);   // barely parallaxes: it is a long way off
      var g = moon.ctx, size = moon.size;

      // stamp the moon, then drag the cloud through it
      g.clearRect(0, 0, size, size);
      g.drawImage(moon.base, 0, 0);
      g.globalCompositeOperation = 'destination-out';
      for(var i = 0; i < moon.clouds.length; i++){
        var cl = moon.clouds[i];
        cl.x += (cl.sp + wind * 0.06) * (dt / 16);
        if(cl.x - cl.r > size * 1.4){ cl.x = -size * 0.6; cl.y = rand(size * 0.18, size * 0.82); }
        punch(g, cl.x, cl.y, cl.r, cl.a);
      }
      g.globalCompositeOperation = 'source-over';

      // the halo it throws into the wet air, and the lightning's share of it
      var lit = 1 + flash * 3.2;
      var hal = ac.createRadialGradient(mx, my, moon.r * 0.5, mx, my, moon.r * 7.5);
      hal.addColorStop(0, 'rgba(196,218,255,' + (0.15 * lit).toFixed(3) + ')');
      hal.addColorStop(0.28, 'rgba(160,192,255,' + (0.06 * lit).toFixed(3) + ')');
      hal.addColorStop(1, 'rgba(120,160,255,0)');
      ac.fillStyle = hal;
      ac.beginPath(); ac.arc(mx, my, moon.r * 7.5, 0, Math.PI * 2); ac.fill();

      // the cloud edges catch it from behind
      for(i = 0; i < moon.clouds.length; i++){
        var c2 = moon.clouds[i];
        var gx = mx - size / 2 + c2.x, gy = my - size / 2 + c2.y;
        var cg = ac.createRadialGradient(gx, gy, c2.r * 0.2, gx, gy, c2.r * 1.5);
        cg.addColorStop(0, 'rgba(178,206,255,' + (0.05 * lit).toFixed(3) + ')');
        cg.addColorStop(1, 'rgba(150,180,255,0)');
        ac.fillStyle = cg;
        ac.beginPath(); ac.arc(gx, gy, c2.r * 1.5, 0, Math.PI * 2); ac.fill();
      }

      ac.drawImage(moon.cvs, mx - size / 2, my - size / 2);
    }

    function makeDrop(seeded){
      var z = rand(0.25, 1);
      return {
        x: rand(-30, aW + 30),
        y: seeded ? rand(0, aH) : rand(-140, -10),
        z: z,
        len: rand(18, 46),
        sp: rand(6, 10)
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
      airDrops = [];
      var rn = Math.round(Math.min(155, aW / 8.5) * density);
      for(var j = 0; j < rn; j++){ airDrops.push(makeDrop(true)); }
      // the nearest water of all: streaks falling between you and the city,
      // too close to focus on
      foreDrops = [];
      var fn = Math.round(Math.min(9, aW / 190) * density);
      for(var q2 = 0; q2 < fn; q2++){ foreDrops.push(makeForeDrop(true)); }
      glass = [];
      buildMoon();
      sparkPalette();
      sparks = [];
      var kn = Math.round(Math.min(110, (aW * aH) / 11000) * density);
      for(var q = 0; q < kn; q++){ sparks.push(makeSpark(true)); }
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

      /* --- furthest thing in the sky, so it goes down first --- */
      drawMoon(t, dt, lastFlash);

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
      for(i = 0; i < airDrops.length; i++){
        p = airDrops[i];
        k = 1 / p.z;
        p.y += p.sp * k * 0.55;
        p.x += wind * k * 0.35;
        if(p.y - p.len * k > aH + 20){ p.y = rand(-160, -20); p.x = rand(-30, aW + 30); }
        if(p.x > aW + 40) p.x = -40; else if(p.x < -40) p.x = aW + 40;

        var L = p.len * k * 0.7, slant = wind * k * 1.4;
        var da = 0.08 + 0.22 * (1 - p.z);
        ac.strokeStyle = 'rgba(190,220,255,' + da.toFixed(3) + ')';
        ac.lineWidth = Math.max(1, 3.2 * k * 0.55);
        ac.lineCap = 'round';
        ac.beginPath();
        ac.moveTo(p.x, p.y);
        ac.lineTo(p.x + slant, p.y + L);
        ac.stroke();
        ac.fillStyle = 'rgba(225,240,255,' + (da * 1.35).toFixed(3) + ')';
        ac.beginPath(); ac.arc(p.x + slant, p.y + L, Math.max(1, 1.9 * k * 0.55), 0, Math.PI * 2); ac.fill();
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

      /* --- glow dust, lifted and lit by the scroll --- */
      var kick = Math.min(1, Math.abs(dy) / 55);
      energy += (kick - energy) * (kick > energy ? 0.35 : 0.045);   // snaps up, settles slowly
      for(i = 0; i < sparks.length; i++){
        p = sparks[i];
        k = 1 / p.z;
        p.x += Math.sin(t * 0.0004 + p.ph) * 0.3 * k + wind * k * 0.22;
        p.y += p.drift * k * 0.35 - shift * (k - 0.55) * 0.17;
        if(p.x > aW + 40) p.x = -40; else if(p.x < -40) p.x = aW + 40;
        if(p.y > aH + 60){ p.y = -40; p.x = rand(-30, aW + 30); }
        else if(p.y < -60){ p.y = aH + 40; p.x = rand(-30, aW + 30); }

        var tw = 0.5 + 0.5 * Math.sin(t * p.tw + p.ph);
        a = Math.min(0.34, (0.05 + 0.22 * (1 - p.z)) * (0.35 + 0.65 * tw) * (0.5 + 1.1 * energy));
        if(a < 0.012) continue;
        var sr = p.r * (0.6 + 0.55 * k);            // near ones bigger, but not blobs
        var sg = ac.createRadialGradient(p.x, p.y, 0, p.x, p.y, sr * 3.6);
        sg.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
        sg.addColorStop(0.35, 'rgba(' + p.col + ',' + (a * 0.75).toFixed(3) + ')');
        sg.addColorStop(1, 'rgba(' + p.col + ',0)');
        ac.fillStyle = sg;
        ac.beginPath(); ac.arc(p.x, p.y, sr * 3.6, 0, Math.PI * 2); ac.fill();
        // the brightest ones throw a small star flare
        if(a > 0.14){
          var fl = sr * (3.4 + 3 * energy);
          ac.strokeStyle = 'rgba(' + p.col + ',' + (a * 0.5).toFixed(3) + ')';
          ac.lineWidth = Math.max(0.6, sr * 0.35);
          ac.beginPath();
          ac.moveTo(p.x - fl, p.y); ac.lineTo(p.x + fl, p.y);
          ac.moveTo(p.x, p.y - fl); ac.lineTo(p.x, p.y + fl);
          ac.stroke();
        }
      }

      /* --- the near water, out of focus, falling past your face --- */
      for(i = 0; i < foreDrops.length; i++){
        p = foreDrops[i];
        p.y += p.sp;
        p.x += wind * 2.2;
        if(p.y - p.len > aH){ foreDrops[i] = makeForeDrop(false); continue; }
        if(p.x > aW + 70) p.x = -70; else if(p.x < -70) p.x = aW + 70;
        var fgr = ac.createLinearGradient(p.x, p.y - p.len, p.x + wind * 6, p.y);
        fgr.addColorStop(0, 'rgba(200,225,255,0)');
        fgr.addColorStop(0.75, 'rgba(205,228,255,' + (p.a * 0.8).toFixed(3) + ')');
        fgr.addColorStop(1, 'rgba(228,242,255,' + p.a.toFixed(3) + ')');
        ac.strokeStyle = fgr; ac.lineWidth = p.w; ac.lineCap = 'round';
        ac.beginPath();
        ac.moveTo(p.x, p.y - p.len);
        ac.lineTo(p.x + wind * 6, p.y);
        ac.stroke();
      }

      /* --- lightning: a sheet behind the ridge, or a bolt over the valley --- */
      var flash = 0;
      if(storm.flashes.length){
        storm.t += dt;
        for(i = 0; i < storm.flashes.length; i++){
          var fl = storm.flashes[i];
          var u = (storm.t - fl.at) / fl.dur;
          if(u > 0 && u < 1){
            var lit = fl.peak * Math.pow(1 - u, 2.4);
            if(lit > flash) flash = lit;
          }
        }
        if(flash > 0.002){
          ac.fillStyle = 'rgba(178,208,255,' + flash.toFixed(3) + ')';
          ac.fillRect(0, 0, aW, aH);
          if(storm.bolt && storm.t < 460){
            var ba = Math.max(flash * 2.6, 0.12);
            strokeBolt(storm.bolt.main, 9, 'rgba(150,190,255,' + (ba * 0.22).toFixed(3) + ')');
            strokeBolt(storm.bolt.main, 3.4, 'rgba(214,232,255,' + (ba * 0.7).toFixed(3) + ')');
            strokeBolt(storm.bolt.main, 1.3, 'rgba(255,255,255,' + Math.min(1, ba).toFixed(3) + ')');
            for(i = 0; i < storm.bolt.branches.length; i++){
              strokeBolt(storm.bolt.branches[i], 2.2, 'rgba(200,224,255,' + (ba * 0.45).toFixed(3) + ')');
              strokeBolt(storm.bolt.branches[i], 0.9, 'rgba(255,255,255,' + (ba * 0.8).toFixed(3) + ')');
            }
          }
        }
        var last = storm.flashes[storm.flashes.length - 1];
        if(storm.t > last.at + last.dur + 240){ storm.flashes = []; storm.bolt = null; }
      } else {
        storm.wait -= dt;
        if(storm.wait <= 0){ strike(); }
      }
      // the same light, but over the top of the city rather than behind it
      if(flashEl){ flashEl.style.opacity = (flash * 0.55).toFixed(3); }
      lastFlash = flash;

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
    flashEl = document.createElement('div');
    flashEl.className = 'storm-flash';
    flashEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flashEl);

    ambSize();
    // keep retrying while layout reports nothing, so the field always seeds
    if(aW < 2){ (function retry(){ if(aW < 2){ ambSize(); requestAnimationFrame(retry); } })(); }
    aPrev = performance.now();
    ambRAF = requestAnimationFrame(ambLoop);
  }

  /* ============================================================
     SCROLL SOLIDS
     Cut charms hung in the shaft you descend as you read. They keep a
     slow turn of their own, but the scroll is the winding key: every
     pixel you travel adds twist and lifts them past you, and the twist
     bleeds off again once you stop. They stay dark over the hero and
     wake on the way down.
     Unlike the dust behind them these have faces, not just edges —
     lambert shading, a Blinn-Phong highlight, a lit rim and a flare off
     whichever facet is currently pointed at the light — so they read as
     polished stone catching the lantern grid rather than as wireframe.
     ============================================================ */
  if(!reduceMotion){
    var shy = document.createElement('canvas');
    shy.id = 'shinies';
    shy.setAttribute('aria-hidden', 'true');
    var afterEl = $('#dragon') || $('#ambient');
    if(afterEl && afterEl.parentNode){ afterEl.parentNode.insertBefore(shy, afterEl.nextSibling); }
    else { document.body.appendChild(shy); }

    var sc = shy.getContext('2d');
    var sW = 0, sH = 0, sDPR = Math.min(1.75, window.devicePixelRatio || 1);
    var charms = [], TINTS = [];

    function srand(a, b){ return a + Math.random() * (b - a); }
    function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }

    /* --- the bodies, as vertices plus faces --- */
    function crossOf(a, b, c){
      var ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
      var vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
      return [uy*vz - uz*vy, uz*vx - ux*vz, ux*vy - uy*vx];
    }
    /* n-sided bipyramid: a girdle of n points with a point above and below.
       n=4 gives a cut stone, n=6 a shard, n=8 something nearly turned. */
    function bipyramid(n, h){
      var v = [[0,-h,0],[0,h,0]], f = [], i, a;
      for(i = 0; i < n; i++){
        a = i / n * Math.PI * 2;
        v.push([Math.cos(a), 0, Math.sin(a)]);
      }
      for(i = 0; i < n; i++){
        f.push([0, 2 + i, 2 + (i + 1) % n]);
        f.push([1, 2 + i, 2 + (i + 1) % n]);
      }
      return { v:v, f:f };
    }
    function icosa(){
      var t = (1 + Math.sqrt(5)) / 2;
      return {
        v: [[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],
            [0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]],
        f: [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
            [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
            [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
            [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]
      };
    }
    /* Scale every body to one radius so the forms mix at a common size, and
       wind every face so its normal points out of the body — done once here
       rather than tested for on every face of every frame. Each body is
       convex and centred on the origin, so "out" is simply "away from the
       centre", and culling the back faces then leaves no overlap to sort. */
    function prep(s){
      var i, r = 0;
      for(i = 0; i < s.v.length; i++){
        r = Math.max(r, Math.sqrt(s.v[i][0]*s.v[i][0] + s.v[i][1]*s.v[i][1] + s.v[i][2]*s.v[i][2]));
      }
      for(i = 0; i < s.v.length; i++){
        s.v[i] = [s.v[i][0]/r, s.v[i][1]/r, s.v[i][2]/r];
      }
      s.f.forEach(function(face){
        var n = crossOf(s.v[face[0]], s.v[face[1]], s.v[face[2]]);
        var cx = 0, cy = 0, cz = 0;
        face.forEach(function(k){ cx += s.v[k][0]; cy += s.v[k][1]; cz += s.v[k][2]; });
        if(n[0]*cx + n[1]*cy + n[2]*cz < 0){ face.reverse(); }
      });
      return s;
    }
    var FORMS = {
      gem:   prep(bipyramid(4, 1.45)),
      shard: prep(bipyramid(6, 1.75)),
      drum:  prep(bipyramid(8, 0.72)),
      ingot: prep({
        v: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
        f: [[0,1,2,3],[5,4,7,6],[4,5,1,0],[3,2,6,7],[4,0,3,7],[1,5,6,2]]
      }),
      orb:   prep(icosa())
    };
    var FORM_KEYS = ['gem','shard','drum','ingot','orb'];

    /* one key light off the upper left, and the half vector it makes with a
       viewer sitting straight out on +z */
    var LIGHT = (function(){
      var l = [-0.40, -0.62, 0.68], m = Math.sqrt(l[0]*l[0] + l[1]*l[1] + l[2]*l[2]);
      return [l[0]/m, l[1]/m, l[2]/m];
    })();
    var HALF = (function(){
      var h = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], m = Math.sqrt(h[0]*h[0] + h[1]*h[1] + h[2]*h[2]);
      return [h[0]/m, h[1]/m, h[2]/m];
    })();
    var DARK = [7, 10, 20], WHITE = [255, 255, 255];

    /* the page's own palette, so each quarter's charms are that quarter's colour */
    function charmPalette(){
      return [
        rgbOf(cssVar('--accent', '#4de8ff')),
        rgbOf(cssVar('--accent-2', '#9a6bff')),
        rgbOf(cssVar('--gold', '#f0b45c')),
        rgbOf(cssVar('--jade', '#4ee8a5'))
      ];
    }

    /* The home page hangs six big cards over this layer, so a charm is only
       ever glimpsed in the gaps between them. Every other page leaves the same
       geometry in open night, where it reads far heavier for no extra pixels —
       so cut them down there, and the whole site lands at the weight the home
       page set. */
    var CHARM_SCALE = $('.districts .card') ? 1 : 0.62;

    function makeCharm(seeded){
      var z = srand(0.5, 1.25);                 // depth; larger is further off
      return {
        form: FORM_KEYS[(Math.random() * FORM_KEYS.length) | 0],
        tint: TINTS[(Math.random() * TINTS.length) | 0] || [77,232,255],
        x: srand(sW * 0.05, sW * 0.95),
        y: seeded ? srand(-sH * 0.1, sH * 1.1) : srand(sH + 80, sH + 420),
        z: z,
        size: srand(19, 44) * CHARM_SCALE / z,
        rx: srand(0, 6.28), ry: srand(0, 6.28), rz: srand(0, 6.28),
        vrx: srand(-0.24, 0.24),
        vry: srand(0.18, 0.5) * (Math.random() < 0.5 ? -1 : 1),
        vrz: srand(-0.14, 0.14),
        drift: srand(-8, 8),                    // px/s sideways
        rise: srand(4, 15),                     // px/s of its own, so a still page still moves
        par: (1.45 - z) * srand(0.34, 0.55),    // near things travel further per scrolled pixel
        bob: srand(0, 6.28), bobRate: srand(0.3, 0.8)
      };
    }

    function drawCharm(p, alpha){
      var s = FORMS[p.form];
      var cx = Math.cos(p.rx), sx = Math.sin(p.rx);
      var cy = Math.cos(p.ry), sy = Math.sin(p.ry);
      var cz = Math.cos(p.rz), sz = Math.sin(p.rz);
      var f = 460, i, j, v, x, y, zz, t, k;
      var view = [], flat = [];

      for(i = 0; i < s.v.length; i++){
        v = s.v[i];
        x = v[0] * p.size; y = v[1] * p.size; zz = v[2] * p.size;
        // X, then Y, then Z
        t = y * cx - zz * sx; zz = y * sx + zz * cx; y = t;
        t = x * cy + zz * sy; zz = -x * sy + zz * cy; x = t;
        t = x * cz - y * sz; y = x * sz + y * cz; x = t;
        view.push([x, y, zz]);
        k = f / (f + zz + p.size * 1.7);        // perspective divide
        flat.push([p.x + x * k, p.y + y * k]);
      }

      // the light it is sitting in, before the body itself
      var halo = sc.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
      halo.addColorStop(0, rgba(p.tint, alpha * 0.15));
      halo.addColorStop(1, rgba(p.tint, 0));
      sc.fillStyle = halo;
      sc.beginPath(); sc.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2); sc.fill();

      var glintX = 0, glintY = 0, glintPow = 0;

      for(i = 0; i < s.f.length; i++){
        var face = s.f[i];
        var a = view[face[0]], b = view[face[1]], c = view[face[2]];
        var ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
        var vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
        var nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
        var nl = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        if(nz <= 0.02) continue;                // facing away: nothing to draw

        var lam  = Math.max(0, nx*LIGHT[0] + ny*LIGHT[1] + nz*LIGHT[2]);
        var spec = Math.pow(Math.max(0, nx*HALF[0] + ny*HALF[1] + nz*HALF[2]), 34);
        var rim  = Math.pow(1 - nz, 2.6) * 0.4;  // facets turned edge-on catch the rim light
        var body = mix(DARK, p.tint, clamp01(0.14 + 0.62 * lam + rim));
        var lit  = mix(body, WHITE, clamp01(spec * 0.9));

        sc.beginPath();
        sc.moveTo(flat[face[0]][0], flat[face[0]][1]);
        for(j = 1; j < face.length; j++){ sc.lineTo(flat[face[j]][0], flat[face[j]][1]); }
        sc.closePath();
        sc.fillStyle = rgba(lit, alpha * clamp01(0.28 + 0.5 * lam + 0.5 * spec));
        sc.fill();
        // the cut edge reads brighter than either facet it divides
        sc.strokeStyle = rgba(mix(p.tint, WHITE, 0.35), alpha * clamp01(0.15 + 0.45 * lam + spec));
        sc.lineWidth = Math.max(0.6, p.size * 0.027);
        sc.stroke();

        if(spec > glintPow){
          glintPow = spec;
          glintX = 0; glintY = 0;
          for(j = 0; j < face.length; j++){ glintX += flat[face[j]][0]; glintY += flat[face[j]][1]; }
          glintX /= face.length; glintY /= face.length;
        }
      }

      /* the flare off whichever facet is square to the light — the part that
         actually says "polished" rather than "faceted" */
      if(glintPow > 0.05){
        var gr = p.size * (0.45 + glintPow * 1.4);
        var g = sc.createRadialGradient(glintX, glintY, 0, glintX, glintY, gr);
        g.addColorStop(0, rgba(WHITE, alpha * clamp01(glintPow * 1.1)));
        g.addColorStop(0.35, rgba(mix(p.tint, WHITE, 0.6), alpha * glintPow * 0.4));
        g.addColorStop(1, rgba(p.tint, 0));
        sc.fillStyle = g;
        sc.beginPath(); sc.arc(glintX, glintY, gr, 0, Math.PI * 2); sc.fill();
        sc.strokeStyle = rgba(WHITE, alpha * glintPow * 0.5);
        sc.lineWidth = Math.max(0.6, p.size * 0.028);
        sc.beginPath();
        sc.moveTo(glintX - gr, glintY);       sc.lineTo(glintX + gr, glintY);
        sc.moveTo(glintX, glintY - gr * 0.75); sc.lineTo(glintX, glintY + gr * 0.75);
        sc.stroke();
      }
    }

    var sRAF = null, sPrev = 0, lastSY = window.scrollY, spin = 0, awake = false;

    function shySize(){
      sW = shy.clientWidth || window.innerWidth;
      sH = shy.clientHeight || window.innerHeight;
      shy.width  = Math.round(sW * sDPR);
      shy.height = Math.round(sH * sDPR);
      sc.setTransform(sDPR, 0, 0, sDPR, 0, 0);
      TINTS = charmPalette();
      var want = Math.max(5, Math.min(coarse ? 7 : 14, Math.round((sW * sH) / 132000)));
      while(charms.length > want){ charms.pop(); }
      while(charms.length < want){ charms.push(makeCharm(true)); }
    }

    function shyDraw(now){
      var dt = Math.min(0.05, (now - sPrev) / 1000) || 0.016;
      sPrev = now;

      var y = window.scrollY, dy = y - lastSY;
      lastSY = y;
      /* An anchor link or an End key arrives as one enormous delta. Taken at
         face value it would sweep the whole field off the top in a single
         frame and leave the shaft empty until the charms drifted back, so
         cap what any one frame is allowed to be worth. */
      var pull = Math.max(-140, Math.min(140, dy));

      /* dark over the hero, full a screen further down, and smoothstepped
         between so they do not snap on */
      var wake = clamp01((y - sH * 0.3) / (sH * 0.55));
      wake = wake * wake * (3 - 2 * wake);

      /* the scroll winds them: distance travelled becomes angular speed,
         which then bleeds off at a rate that does not depend on frame rate */
      spin = Math.min(6, spin + Math.abs(pull) * 0.02) * Math.exp(-2.4 * dt);

      if(wake <= 0.004){
        if(awake){ sc.clearRect(0, 0, sW, sH); awake = false; }
        return;
      }
      awake = true;
      sc.clearRect(0, 0, sW, sH);

      var margin = 300;
      for(var i = 0; i < charms.length; i++){
        var p = charms[i];
        var twist = 1 + spin * 2.2;
        p.rx += p.vrx * twist * dt;
        p.ry += p.vry * twist * dt;
        p.rz += p.vrz * twist * dt;
        p.bob += p.bobRate * dt;
        p.x += (p.drift + Math.sin(p.bob) * 6) * dt;
        p.y -= pull * p.par + p.rise * dt;

        if(p.y < -margin){ charms[i] = p = makeCharm(false); }
        else if(p.y > sH + margin){
          charms[i] = p = makeCharm(false);
          p.y = -srand(60, 320);
        }
        if(p.x < -margin){ p.x = sW + margin; }
        else if(p.x > sW + margin){ p.x = -margin; }

        drawCharm(p, wake);
      }
    }

    function shyLoop(t){
      if(document.hidden){ sRAF = null; return; }   // don't burn frames in a background tab
      shyDraw(t || 0);
      sRAF = requestAnimationFrame(shyLoop);
    }
    document.addEventListener('visibilitychange', function(){
      if(!document.hidden && !sRAF){
        sPrev = performance.now();
        lastSY = window.scrollY;                     // no phantom spin from scrolling while away
        sRAF = requestAnimationFrame(shyLoop);
      }
    });
    var shyResize;
    window.addEventListener('resize', function(){
      clearTimeout(shyResize);
      shyResize = setTimeout(shySize, 200);
    });

    shySize();
    // keep retrying while layout reports nothing, so the field always seeds
    if(sW < 2){ (function retry(){ if(sW < 2){ shySize(); requestAnimationFrame(retry); } })(); }
    sPrev = performance.now();
    sRAF = requestAnimationFrame(shyLoop);
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
