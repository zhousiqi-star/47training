/* ==========================================================================
   今日训练计划页
   - 左上角先选「今天练什么」，选中后加动作时只出现该部位的动作
   - 卡片可自由增减，默认 4 张
   - 点空卡片 → 居中搜索面板（唯一的选择方式）
   - 点圆点记组数，逐颗点亮；每个动作可以填一个重量（kg）
   - 今天的工作区存在 fit-plan-v1，按日期重置；
     同时把当天沉淀进 fit-history-v1（只增不减的日志，见 history.js）
   - 「封存今天的清单」：做完全部动作后按一下，这一天在历史里才合上一枚印
     （没封存的日子在历史里是一条开口的弧，数据不会丢——save() 一直在写日志）
   ========================================================================== */

(function () {
  'use strict';

  var FIT = window.FIT;
  var HIST = window.HIST;
  if (!FIT) return;

  var KEY = 'fit-plan-v1';            // 今天的工作区：可变、按天重置
  var KEY_RECENT = 'fit-recent-v1';   // 最近用过的动作：跨天保留，不再跟着重置
  var DEFAULT_CARDS = 4;
  var DEFAULT_SETS = 4;
  var MAX_SETS = 12;

  var items = [];             // [{ exId, sets, done, weight }]
  var recent = [];            // 最近用过的动作 id
  var focusKey = '';          // 今天练什么：'' = 全部
  var firstOpenedAt = null;   // 今天第一次打开这个页面的时间（不等于训练开始时间）
  var sealedAt = null;        // 今天这份清单被封存的时刻：null = 还是一份草稿
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
  var elSeal      = document.getElementById('seal-day');
  var elOutput    = document.getElementById('output-card');
  var elSub       = document.getElementById('plan-sub');
  var elBar       = document.getElementById('progress-bar');
  var elDate      = document.getElementById('plan-date');
  var elDone      = document.getElementById('meter-done');
  var elTotal     = document.getElementById('meter-total');
  var elPct       = document.getElementById('meter-pct');
  var elMeter     = document.getElementById('meter');
  var elFocusList = document.getElementById('focus-list');
  var elFocusNote = document.getElementById('focus-note');
  var elOverlay   = document.getElementById('overlay');
  var elPickQ     = document.getElementById('pick-q');
  var elPickRange = document.getElementById('pick-range');
  var elPickList  = document.getElementById('pick-list');
  var elPickQuick = document.getElementById('pick-quick');
  var elPickClose = document.getElementById('pick-close');

  /* --------------------------------------------------------------------
     存取
     两套东西：
       fit-plan-v1    今天的工作区，可变，第二天重置
       fit-history-v1 只增不减的日志，每天一条，键是日期（见 history.js）
     -------------------------------------------------------------------- */
  var storageOK = (function () {
    try {
      localStorage.setItem('__fit_test__', '1');
      localStorage.removeItem('__fit_test__');
      return true;
    } catch (e) { return false; }
  })();

  // 日期用零填充的 YYYY-MM-DD —— 这样日志里按字符串排序就是按时间排序
  function todayKey() {
    if (HIST) return HIST.todayKey();
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function saveRecent() {
    try { localStorage.setItem(KEY_RECENT, JSON.stringify({ ids: recent })); } catch (e) { /* 忽略 */ }
  }

  // 「最近用过」跨天保留，所以单独读，不跟着当天记录一起重置
  function loadRecent() {
    try {
      var raw = localStorage.getItem(KEY_RECENT);
      if (raw) {
        var data = JSON.parse(raw);
        recent = Array.isArray(data && data.ids) ? data.ids : [];
        return;
      }
      // 旧版本把它存在 fit-plan-v1 里，搬一次
      var old = localStorage.getItem(KEY);
      if (old) {
        var od = JSON.parse(old);
        if (Array.isArray(od && od.recent) && od.recent.length) {
          recent = od.recent;
          saveRecent();
        }
      }
    } catch (e) { recent = []; }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        date: todayKey(), items: items, focusKey: focusKey,
        firstOpenedAt: firstOpenedAt, sealedAt: sealedAt
      }));
    } catch (e) { /* 隐私模式下写不进去，忽略 */ }
    saveRecent();

    // 沉淀进日志：同一天反复写只覆盖同一条，过了那天就冻结。
    // 只有真的填了动作才记，空手打开不留痕。
    if (!HIST) return;
    var filled = items.filter(function (it) { return it.exId; });
    if (!filled.length) return;
    HIST.upsert({
      date: todayKey(),
      focusKey: focusKey,
      firstOpenedAt: firstOpenedAt,
      updatedAt: Date.now(),
      sealedAt: sealedAt,
      entries: filled.map(function (it) {
        return {
          exId: it.exId,
          sets: +it.sets || 0,
          done: +it.done || 0,
          weight: (it.weight == null || it.weight === '') ? null : +it.weight
        };
      })
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return false;
      // 旧数据用的是 2026-9-16，新的是 2026-09-16，两种都认
      var stored = HIST ? HIST.normalizeDate(data.date) : data.date;
      if (stored !== todayKey()) return false;
      items = data.items;
      focusKey = typeof data.focusKey === 'string' ? data.focusKey : '';
      firstOpenedAt = data.firstOpenedAt || null;
      sealedAt = data.sealedAt || null;
      // 工作区和日志万一不一致，以"盖过印"的那一边为准：封存这个动作不该被丢掉
      if (!sealedAt && HIST && HIST.isSealed(todayKey())) {
        var s = HIST.get(todayKey());
        sealedAt = (s && s.sealedAt) || null;
      }
      return items.length > 0;
    } catch (e) { return false; }
  }

  function blank() { return { exId: null, sets: DEFAULT_SETS, done: 0, weight: null }; }

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
    // 磁贴不再挂分类色相：全站只有一支青加中性灰，部位靠 emoji 和名字区分
    btn.className = 'focus-row' + (isAll ? ' all' : '') + (selected ? ' active' : '');

    // 柱高 = 该部位动作数 ÷ 六个部位里的最大值，真比例，不留装饰性的下限。
    // 「全部动作」不是部位、不在这张图的轴上，所以它没有柱子。
    if (!isAll) {
      var maxCount = 1;
      FIT.groups.forEach(function (grp) {
        maxCount = Math.max(maxCount, FIT.countGroup(grp));
      });
      btn.style.setProperty('--h', Math.round(FIT.countGroup(g) / maxCount * 100) + '%');
    }

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

    var name = document.createElement('span');
    name.className = 'plan-name';
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

    // 重量：一个空，单位固定 kg，不填也能过
    var weightWrap = document.createElement('label');
    weightWrap.className = 'set-weight';

    var weightInput = document.createElement('input');
    weightInput.type = 'text';
    weightInput.inputMode = 'decimal';
    weightInput.autocomplete = 'off';
    weightInput.placeholder = '—';
    weightInput.value = (item.weight == null) ? '' : String(item.weight);
    weightInput.setAttribute('aria-label', ex.name + ' 用的重量，单位公斤');

    var weightUnit = document.createElement('span');
    weightUnit.textContent = 'kg';

    weightWrap.appendChild(weightInput);
    weightWrap.appendChild(weightUnit);

    weightInput.addEventListener('input', function () {
      var raw = weightInput.value.replace(/[^\d.]/g, '');
      if (raw !== weightInput.value) weightInput.value = raw;
      var n = parseFloat(raw);
      item.weight = (raw === '' || !isFinite(n) || n <= 0) ? null : n;
      save();                     // 只存，不重渲染 —— 重渲染会让输入框失焦
    });

    var count = document.createElement('span');
    count.className = 'sets-count';
    count.textContent = item.done + ' / ' + item.sets;

    top.appendChild(label);
    top.appendChild(weightWrap);
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
          e.target.closest('.set-weight') ||
          e.target.closest('.plan-remove')) return;
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
  var FX_COLORS = ['#35e8c9', '#7cf3de', '#22b8a0', '#a8f7e8',
                   '#0fd3b4', '#5eead4', '#c9fbf0', '#35e8c9'];
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

  // 单个动作做满：纸带记录仪世界里不发光晕，只用粒子 + 光环
  function celebrate(el) {
    if (!el || reducedMotion || !el.getBoundingClientRect) return;

    var box = el.getBoundingClientRect();
    var x = box.left + box.width / 2;
    var y = box.top + box.height / 2;

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

    // 用 scaleX 而不是 width：位移动画不触发布局重排
    elBar.style.transform = 'scaleX(' + (pct / 100) + ')';

    if (elDone) elDone.textContent = doneSets;
    if (elTotal) elTotal.textContent = totalSets;

    // 读数板右侧回答的是产品故事里的那句话：「今天还差几组」。
    // 比例已经由读数与进度条表达了，不再重复第三遍。
    if (elPct) {
      var left = totalSets - doneSets;
      elPct.innerHTML = totalSets
        ? (left > 0 ? '还差 <b>' + left + '</b> 组' : '今天做满了')
        : '';
    }
    if (elMeter) {
      elMeter.classList.toggle('is-done', totalSets > 0 && doneSets >= totalSets);
      elMeter.classList.toggle('is-sealed', !!sealedAt);
    }

    // 封存过的一天，读数板下面那行先报封印，再报动作数
    var stamp = sealedAt ? '已封存 ' + fmtTime(sealedAt) + ' · ' : '';
    elSub.textContent = stamp + (totalEx
      ? doneEx + ' / ' + totalEx + ' 个动作已完成'
      : '还没有添加动作，点下面的空卡片开始');

    renderSeal();
  }

  // 顶部日期：只在打开时算一次
  function renderDate() {
    if (!elDate) return;
    var d = new Date();
    var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    elDate.textContent = d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' +
      d.getDate() + ' 日 · ' + week;
  }

  /* --------------------------------------------------------------------
     封存今天的清单
     --------------------------------------------------------------------------
     用户的工作方式：做完全部动作，才输出一张今天的清单。
     在那之前 save() 一直在往日志里写草稿（防丢）——但历史里那一天是**开口的弧**；
     按了这一下，弧才合拢成一枚闭合的印。
     -------------------------------------------------------------------- */

  function fmtTime(ts) {
    var d = new Date(ts);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function filledItems() {
    return items.filter(function (it) { return it.exId; });
  }

  function renderSeal() {
    if (!elSeal) return;
    var canSeal = filledItems().length > 0;

    elSeal.disabled = !canSeal;
    elSeal.classList.toggle('is-sealed', !!sealedAt);
    // 全部做满、还没封存 —— 这时它才是这一栏里该被看见的那一个
    elSeal.classList.toggle('is-ready', !sealedAt && canSeal && allDone());

    if (sealedAt) {
      elSeal.textContent = '已封存 · ' + fmtTime(sealedAt);
      elSeal.setAttribute('aria-label',
        '今天的清单已封存于 ' + fmtTime(sealedAt) + '，再按一次更新封存时刻');
    } else {
      elSeal.textContent = '封存今天的清单';
      elSeal.setAttribute('aria-label', '把今天的清单封存进训练历史');
    }

    // 输出那张记录：封存是盖印，输出是取走那张卡。没封存的一天不给输出
    if (elOutput) elOutput.hidden = !sealedAt || !canSeal;
  }

  /* --------------------------------------------------------------------
     今天这张记录
     --------------------------------------------------------------------------
     卡片由 card.js 用 Canvas 画。这里只负责把当天的数据整理成它要的形状：
     动作名 / 完成组数 / 计划组数 / 那个动作的重量，加上封存时刻。
     -------------------------------------------------------------------- */
  function cardData() {
    var list = filledItems().map(function (it) {
      var w = (it.weight == null || it.weight === '') ? null : parseFloat(it.weight);
      return {
        name: (HIST && HIST.exerciseName) ? HIST.exerciseName(it.exId) : it.exId,
        sets: +it.sets || 0,
        done: Math.min(+it.done || 0, +it.sets || 0),
        weight: (w == null || !isFinite(w) || w <= 0) ? null : w
      };
    });

    var totalSets = 0, doneSets = 0, top = null;
    list.forEach(function (x) {
      totalSets += x.sets;
      doneSets += x.done;
      if (x.weight && (!top || x.weight > top.value)) top = { value: x.weight, name: x.name };
    });

    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];

    return {
      date: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()),
      week: week,
      sealTime: sealedAt ? fmtTime(sealedAt) : '',
      items: list,
      totalSets: totalSets,
      doneSets: doneSets,
      actions: list.length,
      maxWeight: top,
      summary: list.length + ' 个动作 · 计划 ' + totalSets + ' 组'
    };
  }

  function outputCard() {
    if (!sealedAt || !window.FITCARD) return;
    window.FITCARD.open(cardData());
  }

  function sealDay() {
    if (!filledItems().length) return;

    var again = !!sealedAt;
    sealedAt = Date.now();
    save();                       // 时间戳同时写进工作区和日志，两侧不许打架
    renderSeal();
    updateProgress();             // 读数板那行要跟着报封印，否则它停在"还差几组"

    var actions = 0, doneSets = 0;
    filledItems().forEach(function (it) {
      actions++;
      doneSets += Math.min(it.done, it.sets);
    });
    var sub = actions + ' 个动作 · ' + doneSets + ' 组 · ' + fmtTime(sealedAt);
    var title = again ? '已更新封存' : '今天的清单已封存';

    // 这一次的反馈刻意比"全部做满"低一档：彩带只留给那一刻，
    // 封存是从按钮上炸开一圈——印盖在清单上，不是在屏幕中央放烟花。
    if (reducedMotion || !elSeal) { banner(title, sub); return; }

    var r = elSeal.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    burst(x, y, { count: 20, dMin: 40, dMax: 150, sMin: 5, sMax: 11 });
    ring(x, y, false);
    banner(title, sub);
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

  if (elSeal) elSeal.addEventListener('click', sealDay);
  if (elOutput) elOutput.addEventListener('click', outputCard);

  elClear.addEventListener('click', function () {
    if (!window.confirm('清空今天的训练计划？')) return;
    initItems();
    sealedAt = null;                       // 清单清空了，封印也跟着作废
    // 「最近用过」是跨天的记忆，不该被"清空今天"连坐
    if (HIST) HIST.remove(todayKey());     // 今天没练过，日志里也不该留一条
    save();
    render();
  });

  /* --------------------------------------------------------------------
     启动
     -------------------------------------------------------------------- */
  if (!load()) { initItems(); sealedAt = null; }   // 新的一天 → 工作区重置
  if (!firstOpenedAt) firstOpenedAt = Date.now();   // 记下今天第一次打开
  loadRecent();                           // 跨天保留，放在 load 之外
  if (HIST) HIST.migrate();               // 旧数据搬进日志，只做一次
  renderDate();
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
