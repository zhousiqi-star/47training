/* ==========================================================================
   今日训练计划页
   - 左上角先选「今天练什么」，选中后加动作时只出现该部位的动作
   - 卡片可自由增减，默认 4 张
   - 点空卡片 → 居中搜索面板（唯一的选择方式）
   - 点圆点记组数，逐颗点亮
   - 数据存在浏览器本地，按日期自动重置
   ========================================================================== */

(function () {
  'use strict';

  var FIT = window.FIT;
  if (!FIT) return;

  var KEY = 'fit-plan-v1';
  var DEFAULT_CARDS = 4;
  var DEFAULT_SETS = 4;
  var MAX_SETS = 12;

  var items = [];             // [{ exId, sets, done }]
  var recent = [];            // 最近用过的动作 id
  var focusKey = '';          // 今天练什么：'' = 全部
  var activeIndex = -1;       // 正在填写的卡片下标
  var pickAll = false;        // 本次搜索是否忽略部位限制
  var pickResults = [];
  var pickIndex = -1;

  var reducedMotion = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- DOM ----------
  var elList      = document.getElementById('plan-list');
  var elAdd       = document.getElementById('add-card');
  var elClear     = document.getElementById('clear-plan');
  var elSub       = document.getElementById('plan-sub');
  var elBar       = document.getElementById('progress-bar');
  var elFocusList = document.getElementById('focus-list');
  var elFocusNote = document.getElementById('focus-note');
  var elOverlay   = document.getElementById('overlay');
  var elPickQ     = document.getElementById('pick-q');
  var elPickRange = document.getElementById('pick-range');
  var elPickList  = document.getElementById('pick-list');
  var elPickQuick = document.getElementById('pick-quick');
  var elPickClose = document.getElementById('pick-close');

  /* --------------------------------------------------------------------
     存取：按日期保存，第二天自动重置
     -------------------------------------------------------------------- */
  var storageOK = (function () {
    try {
      localStorage.setItem('__fit_test__', '1');
      localStorage.removeItem('__fit_test__');
      return true;
    } catch (e) { return false; }
  })();

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        date: todayKey(), items: items, recent: recent, focusKey: focusKey
      }));
    } catch (e) { /* 隐私模式下写不进去，忽略 */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || data.date !== todayKey() || !Array.isArray(data.items)) return false;
      items = data.items;
      recent = Array.isArray(data.recent) ? data.recent : [];
      focusKey = typeof data.focusKey === 'string' ? data.focusKey : '';
      return items.length > 0;
    } catch (e) { return false; }
  }

  function blank() { return { exId: null, sets: DEFAULT_SETS, done: 0 }; }

  function initItems() {
    items = [];
    for (var i = 0; i < DEFAULT_CARDS; i++) items.push(blank());
  }

  function currentGroup() {
    return focusKey ? FIT.groupByKey(focusKey) : null;
  }

  /* --------------------------------------------------------------------
     左上角：今天练什么
     -------------------------------------------------------------------- */
  function renderFocus() {
    elFocusList.innerHTML = '';

    FIT.groups.forEach(function (g) {
      elFocusList.appendChild(makeFocusRow(g));
    });

    elFocusList.appendChild(makeFocusRow(null));

    var g = currentGroup();
    elFocusNote.textContent = g
      ? '已选「' + g.label + '」，加动作时只会显示' + g.noun + '的 ' +
        FIT.countGroup(g) + ' 个动作'
      : '没有限制，加动作时会显示全部 ' + FIT.data.length + ' 个动作';
    elFocusNote.classList.toggle('on', !!g);
  }

  function makeFocusRow(g) {
    var isAll = !g;
    var selected = isAll ? !focusKey : focusKey === g.key;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'focus-row' + (selected ? ' active' : '') + (isAll ? ' all' : '');

    var emoji = document.createElement('span');
    emoji.className = 'focus-emoji';
    emoji.textContent = isAll ? '📋' : g.emoji;

    var label = document.createElement('span');
    label.className = 'focus-label';
    label.textContent = isAll ? '全部动作' : g.label;

    var count = document.createElement('span');
    count.className = 'focus-count';
    count.textContent = (isAll ? FIT.data.length : FIT.countGroup(g)) + ' 个';

    btn.appendChild(emoji);
    btn.appendChild(label);
    btn.appendChild(count);

    btn.addEventListener('click', function () {
      focusKey = isAll ? '' : g.key;
      save();
      renderFocus();

      // 如果面板正开着，立刻按新范围刷新
      if (activeIndex > -1) {
        pickAll = false;
        renderRange();
        renderPickList(elPickQ.value);
      }
    });

    return btn;
  }

  /* --------------------------------------------------------------------
     计划卡片
     -------------------------------------------------------------------- */
  function render() {
    elList.innerHTML = '';
    items.forEach(function (item, idx) {
      elList.appendChild(makeCard(item, idx));
    });
    updateProgress();
  }

  function makeCard(item, idx) {
    var card = document.createElement('div');
    card.className = 'plan-card ' + (item.exId ? 'filled' : 'empty');
    if (item.exId && item.sets > 0 && item.done >= item.sets) card.classList.add('complete');
    card.dataset.index = idx;

    var head = document.createElement('div');
    head.className = 'plan-card-head';

    var num = document.createElement('span');
    num.className = 'plan-num';
    num.textContent = ('0' + (idx + 1)).slice(-2);

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'plan-remove';
    remove.textContent = '✕';
    remove.title = '删除这个动作';
    remove.addEventListener('click', function (e) {
      e.stopPropagation();
      removeCard(idx);
    });

    head.appendChild(num);
    head.appendChild(remove);
    card.appendChild(head);

    if (!item.exId) {
      var empty = document.createElement('button');
      empty.type = 'button';
      empty.className = 'plan-empty';

      var icon = document.createElement('span');
      icon.className = 'plan-empty-icon';
      icon.textContent = '＋';

      var text = document.createElement('span');
      text.className = 'plan-empty-text';
      text.textContent = '第 ' + (idx + 1) + ' 个动作';

      var hint = document.createElement('span');
      hint.className = 'plan-empty-hint';
      hint.textContent = '点击选择动作';

      empty.appendChild(icon);
      empty.appendChild(text);
      empty.appendChild(hint);
      empty.addEventListener('click', function () { openPicker(idx); });
      card.appendChild(empty);

      return card;
    }

    var ex = FIT.findById(item.exId);
    if (!ex) { item.exId = null; return makeCard(item, idx); }

    var body = document.createElement('div');
    body.className = 'plan-body';

    var name = document.createElement('a');
    name.className = 'plan-name';
    name.href = 'exercise.html?id=' + encodeURIComponent(ex.id);
    name.textContent = ex.name;

    var tags = document.createElement('div');
    tags.className = 'plan-tags';
    [ex.primaryMuscle, ex.difficulty].concat(ex.equipment || [])
      .filter(Boolean)
      .forEach(function (t, i) {
        var span = document.createElement('span');
        span.className = 'tag' + (i === 0 ? ' primary' : '');
        span.textContent = t;
        tags.appendChild(span);
      });

    body.appendChild(name);
    body.appendChild(tags);
    card.appendChild(body);

    // 组数区
    var block = document.createElement('div');
    block.className = 'sets-block';

    var top = document.createElement('div');
    top.className = 'sets-top';

    var label = document.createElement('span');
    label.className = 'sets-label';
    label.textContent = '完成组数';

    var count = document.createElement('span');
    count.className = 'sets-count';
    count.textContent = item.done + ' / ' + item.sets;

    top.appendChild(label);
    top.appendChild(count);

    var bottom = document.createElement('div');
    bottom.className = 'sets-bottom';

    var dots = document.createElement('div');
    dots.className = 'set-dots';
    for (var i = 0; i < item.sets; i++) {
      dots.appendChild(makeDot(item, i, card));
    }

    var stepper = document.createElement('div');
    stepper.className = 'sets-stepper';

    var minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.title = '减少一组';
    minus.addEventListener('click', function () { changeSets(idx, -1); });

    var setNum = document.createElement('span');
    setNum.textContent = item.sets;

    var plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '＋';
    plus.title = '增加一组';
    plus.addEventListener('click', function () { changeSets(idx, 1); });

    stepper.appendChild(minus);
    stepper.appendChild(setNum);
    stepper.appendChild(plus);

    bottom.appendChild(dots);
    bottom.appendChild(stepper);

    block.appendChild(top);
    block.appendChild(bottom);
    card.appendChild(block);

    card.addEventListener('click', function (e) {
      if (e.target.closest('.set-dot') ||
          e.target.closest('.sets-stepper') ||
          e.target.closest('.plan-remove') ||
          e.target.closest('.plan-name')) return;
      openPicker(idx);
    });

    return card;
  }

  function makeDot(item, i, card) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'set-dot' + (i < item.done ? ' done' : '');
    dot.title = '第 ' + (i + 1) + ' 组';
    dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 组');

    dot.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSet(item, i, card);
    });

    return dot;
  }

  /* --------------------------------------------------------------------
     完成动作时的烟花（纯 CSS 粒子，无第三方库）
     -------------------------------------------------------------------- */
  var FX_COLORS = ['#ea580c', '#f59e0b', '#fbbf24', '#fb923c',
                   '#d97706', '#fcd34d', '#f97316', '#fde68a'];
  var fxLayer = null;

  function rand(min, max) { return min + Math.random() * (max - min); }

  function getFxLayer() {
    if (!fxLayer) {
      fxLayer = document.createElement('div');
      fxLayer.className = 'fx-layer';
      document.body.appendChild(fxLayer);
    }
    return fxLayer;
  }

  function removeLater(el, ms) {
    var done = false;
    function kill() {
      if (done) return;
      done = true;
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    el.addEventListener('animationend', kill);
    setTimeout(kill, ms);
  }

  // 一圈向外炸开的粒子（圆形 + 少量长条彩带）
  function burst(x, y, opt) {
    opt = opt || {};

    var count = opt.count || 16;
    var dMin = opt.dMin || 44, dMax = opt.dMax || 106;
    var sMin = opt.sMin || 5, sMax = opt.sMax || 9;
    var layer = getFxLayer();

    for (var i = 0; i < count; i++) {
      var p = document.createElement('i');
      var isRibbon = Math.random() < 0.3;

      p.className = isRibbon ? 'fx-ribbon' : 'fx-particle';

      var angle = (Math.PI * 2 * i) / count + rand(-0.25, 0.25);
      var dist = rand(dMin, dMax);
      var size = rand(sMin, sMax);

      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = FX_COLORS[(Math.random() * FX_COLORS.length) | 0];
      p.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--ty', (Math.sin(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--rot', rand(-450, 450).toFixed(0) + 'deg');
      p.style.animationDelay = rand(0, 90).toFixed(0) + 'ms';

      if (isRibbon) {
        p.style.width = Math.max(3, size * 0.45).toFixed(1) + 'px';
        p.style.height = (size * 1.9).toFixed(1) + 'px';
      } else {
        p.style.width = size.toFixed(1) + 'px';
        p.style.height = size.toFixed(1) + 'px';
      }

      layer.appendChild(p);
      removeLater(p, 1500);
    }
  }

  // 中心扩散的光环
  function ring(x, y, big) {
    var r = document.createElement('i');
    r.className = 'fx-ring' + (big ? ' big' : '');
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    getFxLayer().appendChild(r);
    removeLater(r, 1200);
  }

  // 爆点的一团柔光
  function flash(x, y, big) {
    var f = document.createElement('i');
    f.className = 'fx-flash' + (big ? ' big' : '');
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    getFxLayer().appendChild(f);
    removeLater(f, 1100);
  }

  // 单个动作做满
  function celebrate(el) {
    if (!el || reducedMotion || !el.getBoundingClientRect) return;

    var box = el.getBoundingClientRect();
    var x = box.left + box.width / 2;
    var y = box.top + box.height / 2;

    flash(x, y);
    burst(x, y, { count: 26, dMin: 60, dMax: 175, sMin: 5, sMax: 11 });
    ring(x, y);

    // 第二波，收得近一点，形成层次
    setTimeout(function () {
      burst(x, y, { count: 16, dMin: 28, dMax: 105, sMin: 4, sMax: 8 });
      ring(x, y);
    }, 150);
  }

  // 从屏幕顶部撒落的彩带
  function confetti() {
    var layer = getFxLayer();
    var count = 48;

    for (var i = 0; i < count; i++) {
      var c = document.createElement('i');
      c.className = 'fx-confetti';

      var dur = rand(2.2, 3.6);
      var size = rand(6, 11);

      c.style.left = (Math.random() * 100).toFixed(2) + 'vw';
      c.style.background = FX_COLORS[(Math.random() * FX_COLORS.length) | 0];
      c.style.width = size.toFixed(1) + 'px';
      c.style.height = (size * rand(1.2, 2)).toFixed(1) + 'px';
      c.style.setProperty('--rot', rand(-1440, 1440).toFixed(0) + 'deg');
      c.style.setProperty('--drift', rand(-160, 160).toFixed(0) + 'px');
      c.style.animationDuration = dur.toFixed(2) + 's';
      c.style.animationDelay = rand(0, 0.9).toFixed(2) + 's';

      layer.appendChild(c);
      removeLater(c, (dur + 1.3) * 1000);
    }
  }

  // 中间的大横幅
  function banner(title, sub) {
    var b = document.createElement('div');
    b.className = 'fx-banner';

    var t = document.createElement('div');
    t.className = 'fx-banner-title';
    t.textContent = title;

    var s = document.createElement('div');
    s.className = 'fx-banner-sub';
    s.textContent = sub;

    b.appendChild(t);
    b.appendChild(s);
    getFxLayer().appendChild(b);
    removeLater(b, 4000);
  }

  // 整份计划全部完成
  function celebrateAll() {
    var totalSets = 0;
    items.forEach(function (it) { if (it.exId) totalSets += it.sets; });

    var sub = '所有动作都做满了 · 共 ' + totalSets + ' 组';

    if (reducedMotion) {
      banner('🎉 今天的训练全部完成！', sub);
      return;
    }

    var w = window.innerWidth || 900;
    var h = window.innerHeight || 700;

    // 五连炸，散布在屏幕各处
    for (var i = 0; i < 5; i++) {
      (function (i) {
        setTimeout(function () {
          var x = w * rand(0.12, 0.88);
          var y = h * rand(0.15, 0.6);
          flash(x, y, true);
          burst(x, y, { count: 32, dMin: 80, dMax: 250, sMin: 6, sMax: 14 });
          ring(x, y, true);
        }, i * 130);
      })(i);
    }

    confetti();
    banner('🎉 今天的训练全部完成！', sub);
  }

  // 整份计划是否都做满了
  function allDone() {
    var filled = items.filter(function (it) { return it.exId; });
    if (!filled.length) return false;
    return filled.every(function (it) {
      return it.sets > 0 && it.done >= it.sets;
    });
  }

  /* --------------------------------------------------------------------
     组数交互
     -------------------------------------------------------------------- */
  function toggleSet(item, i, card) {
    var prev = item.done;
    var wasAllDone = allDone();

    // 点最后一颗已点亮的点 = 取消它；否则点亮到这一颗
    if (i + 1 === item.done) item.done = i;
    else item.done = i + 1;

    var dots = card.querySelectorAll('.set-dot');
    for (var k = 0; k < dots.length; k++) {
      dots[k].classList.toggle('done', k < item.done);
    }

    if (item.done > prev) {
      for (var a = prev; a < item.done; a++) pulse(dots[a], (a - prev) * 45);
    } else if (item.done < prev && dots[item.done]) {
      pulse(dots[item.done], 0);
    }

    var count = card.querySelector('.sets-count');
    if (count) count.textContent = item.done + ' / ' + item.sets;

    // 刚好做满这个动作 → 放个烟花
    var wasComplete = item.sets > 0 && prev >= item.sets;
    var isComplete = item.sets > 0 && item.done >= item.sets;

    card.classList.toggle('complete', isComplete);

    if (isComplete && !wasComplete) {
      celebrate(dots[item.done - 1] || card);
      card.classList.add('just-complete');
      setTimeout(function () { card.classList.remove('just-complete'); }, 700);

      // 整份计划刚好全部做满 → 大庆祝
      if (allDone() && !wasAllDone) celebrateAll();
    }

    updateProgress();
    save();
  }

  function changeSets(idx, delta) {
    var item = items[idx];
    if (!item) return;

    var next = item.sets + delta;
    if (next < 1 || next > MAX_SETS) return;

    item.sets = next;
    if (item.done > item.sets) item.done = item.sets;

    save();
    render();
  }

  function pulse(el, delay) {
    if (!el) return;
    el.style.animationDelay = (delay || 0) + 'ms';
    el.classList.remove('pop');
    void el.offsetWidth;      // 强制重排，让动画能重新播放
    el.classList.add('pop');
  }

  function updateProgress() {
    var totalSets = 0, doneSets = 0, totalEx = 0, doneEx = 0;

    items.forEach(function (it) {
      if (!it.exId) return;
      totalEx++;
      totalSets += it.sets;
      doneSets += Math.min(it.done, it.sets);
      if (it.sets > 0 && it.done >= it.sets) doneEx++;
    });

    var pct = totalSets ? Math.round(doneSets / totalSets * 100) : 0;
    elBar.style.width = pct + '%';

    elSub.textContent = totalEx
      ? '已完成 ' + doneSets + ' / ' + totalSets + ' 组 · ' +
        doneEx + ' / ' + totalEx + ' 个动作'
      : '还没有添加动作，点下面的空卡片开始';
  }

  /* --------------------------------------------------------------------
     增删卡片
     -------------------------------------------------------------------- */
  function addCard() {
    items.push(blank());
    save();
    render();

    var last = elList.lastElementChild;
    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function removeCard(idx) {
    items.splice(idx, 1);
    if (!items.length) items.push(blank());
    if (activeIndex === idx) closePicker();
    else if (activeIndex > idx) activeIndex--;
    save();
    render();
  }

  /* --------------------------------------------------------------------
     选择动作：居中面板
     -------------------------------------------------------------------- */
  function openPicker(idx) {
    activeIndex = idx;
    pickIndex = -1;
    pickAll = false;

    elPickQ.value = '';
    elPickQ.placeholder = '搜索动作，填入第 ' + (idx + 1) + ' 个动作';
    renderRange();
    renderQuick();
    renderPickList('');

    elOverlay.hidden = false;

    setTimeout(function () { elPickQ.focus(); }, 30);
  }

  function closePicker() {
    activeIndex = -1;
    elOverlay.hidden = true;
  }

  // 面板顶部的一行：当前范围 + 「看全部」
  function renderRange() {
    var g = pickAll ? null : currentGroup();

    elPickRange.innerHTML = '';

    var text = document.createElement('span');
    text.className = 'pick-range-text';
    text.textContent = g ? '范围：' + g.label : '范围：全部动作';
    elPickRange.appendChild(text);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pick-range-toggle';
    toggle.textContent = g ? '看全部动作' : (currentGroup() ? '只看' + currentGroup().label : '');
    if (toggle.textContent) {
      toggle.addEventListener('click', function () {
        pickAll = !pickAll;
        renderRange();
        renderPickList(elPickQ.value);
      });
      elPickRange.appendChild(toggle);
    }

    var count = document.createElement('span');
    count.className = 'pick-range-count';
    count.textContent = countInRange() + ' 个动作';
    elPickRange.appendChild(count);
  }

  function countInRange() {
    var g = pickAll ? null : currentGroup();
    var n = 0;
    FIT.data.forEach(function (item) { if (FIT.inGroup(item, g)) n++; });
    return n;
  }

  function renderQuick() {
    elPickQuick.innerHTML = '';

    var g = pickAll ? null : currentGroup();

    var list = recent
      .map(function (id) { return FIT.findById(id); })
      .filter(function (ex) { return ex && FIT.inGroup(ex, g); })
      .slice(0, 5);

    if (!list.length) return;

    var label = document.createElement('span');
    label.className = 'pick-quick-label';
    label.textContent = '最近用过';
    elPickQuick.appendChild(label);

    list.forEach(function (ex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = ex.name;
      b.addEventListener('click', function () { chooseItem(ex.id); });
      elPickQuick.appendChild(b);
    });
  }

  function renderPickList(q) {
    var g = pickAll ? null : currentGroup();

    pickResults = FIT.search(q).filter(function (entry) {
      return FIT.inGroup(entry.item, g);
    }).slice(0, 40);

    pickIndex = -1;
    elPickList.innerHTML = '';

    if (!pickResults.length) {
      var none = document.createElement('div');
      none.className = 'pick-empty';
      none.textContent = g
        ? '「' + g.label + '」里没有匹配的动作，点上面的「看全部动作」试试'
        : '没有找到匹配的动作';
      elPickList.appendChild(none);
      return;
    }

    pickResults.forEach(function (entry, i) {
      var ex = entry.item;

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick-item';
      b.dataset.index = i;

      var name = document.createElement('span');
      name.className = 'pick-name';
      name.textContent = ex.name;

      var meta = document.createElement('span');
      meta.className = 'pick-meta';
      meta.textContent = [ex.primaryMuscle, ex.difficulty]
        .concat(ex.equipment || [])
        .filter(Boolean)
        .join(' · ');

      b.appendChild(name);
      b.appendChild(meta);
      b.addEventListener('click', function () { choose(i); });

      elPickList.appendChild(b);
    });
  }

  function highlightPick() {
    var nodes = elPickList.querySelectorAll('.pick-item');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('active', i === pickIndex);
    }
    if (nodes[pickIndex]) nodes[pickIndex].scrollIntoView({ block: 'nearest' });
  }

  function choose(i) {
    if (!pickResults[i]) return;
    chooseItem(pickResults[i].item.id);
  }

  function chooseItem(id) {
    if (activeIndex < 0) return;

    var idx = activeIndex;
    var item = items[idx];
    if (!item) return;

    item.exId = id;
    if (!item.sets) item.sets = DEFAULT_SETS;
    if (item.done > item.sets) item.done = item.sets;

    recent = [id].concat(recent.filter(function (x) { return x !== id; })).slice(0, 8);

    closePicker();
    save();
    render();

    var card = elList.querySelector('.plan-card[data-index="' + idx + '"]');
    if (card) {
      card.classList.add('just-filled');
      setTimeout(function () { card.classList.remove('just-filled'); }, 650);
    }
  }

  /* --------------------------------------------------------------------
     事件
     -------------------------------------------------------------------- */
  elPickQ.addEventListener('input', function () {
    renderPickList(elPickQ.value);
  });

  elPickQ.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePicker(); return; }

    var count = pickResults.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      pickIndex = Math.min(pickIndex + 1, count - 1);
      highlightPick();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      pickIndex = Math.max(pickIndex - 1, 0);
      highlightPick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (pickIndex > -1) choose(pickIndex);
      else if (count) choose(0);
    }
  });

  elPickClose.addEventListener('click', closePicker);

  elOverlay.addEventListener('click', function (e) {
    if (e.target === elOverlay) closePicker();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeIndex > -1) closePicker();
  });

  elAdd.addEventListener('click', addCard);

  elClear.addEventListener('click', function () {
    if (!window.confirm('清空今天的训练计划？')) return;
    initItems();
    recent = [];
    save();
    render();
  });

  /* --------------------------------------------------------------------
     启动
     -------------------------------------------------------------------- */
  if (!load()) initItems();
  renderFocus();
  render();

  if (!storageOK) {
    var notice = document.createElement('p');
    notice.className = 'plan-warn';
    notice.textContent =
      '当前浏览器不允许本地存储，刷新后计划不会保留。' +
      '建议用 Chrome / Edge 打开，或把网站部署到线上再用。';
    elSub.parentNode.appendChild(notice);
  }
})();
