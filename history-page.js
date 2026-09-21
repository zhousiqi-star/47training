/* ==========================================================================
   训练历史页
   --------------------------------------------------------------------------
   这台机器自己的记录盘。一天 = 一枚环：

     · 闭合的圆 —— 那天被封存过（你在首页按了「封存今天的清单」）
     · 开口的弧 —— 那天有记录，但还没封存（含"今天"）；弧的末端一根指针
     · 空槽     —— 那天没练。它就是一块凹进去的孔，不画低谷、不道歉

   两条数据编码，都沿用首页的纪律（共用一条轴、不做装饰性压缩）：
     · 环的粗细 = 那天的完成组数，按本区间内最大值归一
     · 环下的小字 = 同一个数字，写出来（颜色和粗细都不是唯一信号）

   区间：本月（环历）/ 本年（12 栏柱阵）/ 全部（年份清单）。
   下面接一段「销轨」：每个记过重量的动作一行水平凹槽，销子停在最近一次。
   ========================================================================== */

(function () {
  'use strict';

  var HIST = window.HIST;
  if (!HIST) return;

  // ---------- DOM ----------
  var elRange  = document.getElementById('ledger-range');
  var elNums   = document.getElementById('ledger-nums');
  var elCmp    = document.getElementById('ledger-cmp');
  var elSwitch = document.getElementById('range-switch');
  var elLegend = document.getElementById('ledger-legend');
  var elBoard  = document.getElementById('board');
  var elSheet  = document.getElementById('sheet');
  var elRails  = document.getElementById('rails');
  var elDanger = document.getElementById('danger');

  var todayKey = HIST.todayKey();

  var state = {
    range: 'month',                       // month | year | all
    ym: todayKey.slice(0, 7),             // '2026-09'
    year: todayKey.slice(0, 4),           // '2026'
    openDate: null                        // 展开着的那一天
  };

  /* --------------------------------------------------------------------
     小工具
     -------------------------------------------------------------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmtKg(n) {
    if (!isFinite(n) || n <= 0) return '—';
    return String(Math.round(n * 10) / 10);
  }
  function cnMonth(ym) { return (+ym.slice(5, 7)) + ' 月'; }
  function cnDate(key) { return (+key.slice(5, 7)) + ' 月 ' + (+key.slice(8, 10)) + ' 日'; }
  function weekdayOf(key) {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
      new Date(key + 'T00:00:00').getDay()];
  }
  function timeOf(ts) {
    var d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function prevYm(ym) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1;
    if (m < 1) { m = 12; y--; }
    return y + '-' + pad(m);
  }
  function daysIn(ym) { return new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(); }

  /* --------------------------------------------------------------------
     区间
     -------------------------------------------------------------------- */
  function sessionsOf() {
    if (state.range === 'month') return HIST.month(state.ym);
    if (state.range === 'year') return HIST.year(state.year);
    return HIST.all();
  }

  /* 与上一段做"同期"对比：本月 = 上月 1 号到上月的同一天；本年 = 去年 1 月 1 日到去年今天。
     看历史月份/年份时整段比整段——同期只在还没走完的这段时间里才成立。 */
  function compareWith() {
    var now = new Date();
    if (state.range === 'month') {
      var pym = prevYm(state.ym);
      if (state.ym !== todayKey.slice(0, 7)) {
        return { label: '上月', list: HIST.month(pym) };
      }
      var d = Math.min(now.getDate(), daysIn(pym));
      return { label: '上月同期', list: HIST.range(pym + '-01', pym + '-' + pad(d)) };
    }
    if (state.range === 'year') {
      var py = String(+state.year - 1);
      if (state.year !== todayKey.slice(0, 4)) {
        return { label: '去年', list: HIST.year(py) };
      }
      var p = py + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
      return { label: '去年同期', list: HIST.range(py + '-01-01', p) };
    }
    return null;
  }

  /* --------------------------------------------------------------------
     铭牌：区间读数刻在一块凹槽里
     -------------------------------------------------------------------- */
  function heaviest(list) {
    var best = null;
    (list || []).forEach(function (s) {
      (s.entries || []).forEach(function (e) {
        if (!e || !e.exId) return;
        var w = parseFloat(e.weight);
        if (!isFinite(w) || w <= 0) return;
        if (!best || w > best.value) {
          best = { value: w, name: HIST.exerciseName(e.exId), date: s.date };
        }
      });
    });
    return best;
  }

  function numBox(label, value, unit, note) {
    var box = el('div', 'num-box');
    box.appendChild(el('span', 'num-label', label));
    var v = el('span', 'num-value', value);
    if (unit) v.appendChild(el('em', 'num-unit', unit));
    box.appendChild(v);
    if (note) box.appendChild(el('span', 'num-note', note));
    return box;
  }

  function renderLedger() {
    var list = sessionsOf();
    var st = HIST.stats(list);
    var top = heaviest(list);

    elRange.textContent = state.range === 'month'
      ? state.ym.slice(0, 4) + ' 年 ' + cnMonth(state.ym)
      : (state.range === 'year' ? state.year + ' 年' : '全部记录');

    elNums.innerHTML = '';
    elNums.appendChild(numBox('训练天数', String(st.days), '天', null));
    elNums.appendChild(numBox('完成组数', String(st.doneSets), '组', null));
    elNums.appendChild(numBox('最重的一组', top ? fmtKg(top.value) : '—', top ? 'kg' : '',
      top ? top.name : '还没记过重量'));

    if (!st.days) {
      elCmp.textContent = '这段区间还没有记录。';
      return;
    }
    if (state.range === 'all') {
      elCmp.textContent = '从 ' + st.firstDate + ' 记起 · 其中 ' + st.sealedDays + ' 天已封存';
      return;
    }
    var prev = compareWith();
    if (!prev) { elCmp.textContent = ''; return; }
    var was = HIST.sumDone(prev.list);
    var now = HIST.sumDone(list);
    if (!was) {
      elCmp.textContent = prev.label + '没有记录。';
      return;
    }
    var diff = now - was;
    elCmp.textContent = prev.label + ' ' + was + ' 组，' +
      (diff === 0 ? '和它一样。' : (diff > 0 ? '多 ' + diff + ' 组。' : '少 ' + (-diff) + ' 组。'));
  }

  /* --------------------------------------------------------------------
     区间切换：本月 / 本年 / 全部
     -------------------------------------------------------------------- */
  var RANGES = [['month', '本月'], ['year', '本年'], ['all', '全部']];

  function renderSwitch() {
    elSwitch.innerHTML = '';
    RANGES.forEach(function (r) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'range-btn' + (state.range === r[0] ? ' is-on' : '');
      b.textContent = r[1];
      b.setAttribute('aria-pressed', state.range === r[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (state.range === r[0]) return;
        state.range = r[0];
        state.openDate = null;
        render();
      });
      elSwitch.appendChild(b);
    });
  }

  /* --------------------------------------------------------------------
     一天的格子
     -------------------------------------------------------------------- */
  var NS = 'http://www.w3.org/2000/svg';
  var R = 15;                              // 环半径（viewBox 36×36，中心 18）
  var CIRC = 2 * Math.PI * R;

  function ariaFor(cell) {
    if (cell.date > todayKey) return cnDate(cell.date) + '，还没到';
    if (!cell.has) return cnDate(cell.date) + '，没有记录';
    return cnDate(cell.date) + '，' + cell.done + ' 组，' + cell.actions + ' 个动作，' +
      (cell.sealed ? '已封存 ' + timeOf(cell.sealedAt) : '还没封存');
  }

  function ringArc(cell, maxDone) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('class', 'ring-svg');
    svg.setAttribute('aria-hidden', 'true');
    if (!cell.has) return svg;

    // 粗细 = 那天的完成组数 ÷ 本区间最大值（共用一条轴，不做装饰性下限）
    var ratio = maxDone > 0 ? Math.min(1, cell.done / maxDone) : 0;
    var w = 2 + 2.6 * ratio;

    var arc = document.createElementNS(NS, 'circle');
    arc.setAttribute('cx', 18); arc.setAttribute('cy', 18); arc.setAttribute('r', R);
    arc.setAttribute('class', 'ring-arc');
    arc.setAttribute('stroke-width', w.toFixed(2));

    if (cell.sealed) {
      arc.setAttribute('stroke-dasharray', 'none');       // 闭合的印
    } else {
      arc.setAttribute('stroke-dasharray', (CIRC * 0.75).toFixed(2) + ' ' + CIRC.toFixed(2));
      arc.setAttribute('transform', 'rotate(-90 18 18)'); // 从 12 点开始，顺时针 3/4 圈
      var tip = document.createElementNS(NS, 'rect');
      tip.setAttribute('class', 'ring-tip');
      tip.setAttribute('x', 18 - R - w / 2 - 3);
      tip.setAttribute('y', 18 - 1);
      tip.setAttribute('width', 6);
      tip.setAttribute('height', 2);
      tip.setAttribute('rx', 1);
      svg.appendChild(tip);
    }
    svg.appendChild(arc);
    return svg;
  }

  function makeDayCell(cell, maxDone) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ring-day' +
      (cell.sealed ? ' is-sealed' : (cell.has ? ' is-open' : ' is-empty')) +
      (cell.date === todayKey ? ' is-today' : '') +
      (cell.date > todayKey ? ' is-future' : '') +
      (state.openDate === cell.date ? ' is-picked' : '');
    btn.setAttribute('aria-label', ariaFor(cell));

    var disc = el('span', 'ring-disc');
    btn.appendChild(disc);
    btn.appendChild(ringArc(cell, maxDone));
    var num = el('span', 'ring-num', String(cell.day));
    btn.appendChild(num);
    btn.appendChild(el('span', 'ring-sets', cell.has ? String(cell.done) : ''));

    btn.addEventListener('click', function () {
      state.openDate = state.openDate === cell.date ? null : cell.date;
      renderBoard();
      renderSheet();
      if (state.openDate && elSheet.scrollIntoView) {
        elSheet.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return btn;
  }

  /* --------------------------------------------------------------------
     主区
     -------------------------------------------------------------------- */
  function boardHead(titleText, withNav) {
    var head = el('div', 'board-head');
    head.appendChild(el('h2', 'board-title', titleText));
    if (withNav) {
      var nav = el('div', 'board-nav');
      var prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'month-btn month-prev';
      prev.textContent = '‹';                 // 字形由掩膜替换；掩膜画不出来时才露出来
      prev.setAttribute('aria-label', '上一个月');
      prev.addEventListener('click', function () {
        state.ym = prevYm(state.ym);
        state.openDate = null;
        render();
      });

      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'month-btn month-next';
      next.textContent = '›';
      next.setAttribute('aria-label', '下一个月');
      next.disabled = state.ym >= todayKey.slice(0, 7);
      next.addEventListener('click', function () {
        if (next.disabled) return;
        var y = +state.ym.slice(0, 4), m = +state.ym.slice(5, 7) + 1;
        if (m > 12) { m = 1; y++; }
        state.ym = y + '-' + pad(m);
        state.openDate = null;
        render();
      });

      nav.appendChild(prev);
      nav.appendChild(next);
      head.appendChild(nav);
    }
    return head;
  }

  function renderMonth() {
    elBoard.appendChild(boardHead(state.ym.slice(0, 4) + ' 年 ' + cnMonth(state.ym), true));

    var grid = el('div', 'ring-grid');
    ['一', '二', '三', '四', '五', '六', '日'].forEach(function (w) {
      grid.appendChild(el('div', 'ring-dow', w));
    });

    var cells = HIST.monthCells(state.ym);
    var maxDone = 0;
    cells.forEach(function (c) { if (c && c.done > maxDone) maxDone = c.done; });

    cells.forEach(function (c) {
      if (!c) { grid.appendChild(el('div', 'ring-void')); return; }
      grid.appendChild(makeDayCell(c, maxDone));
    });
    elBoard.appendChild(grid);
  }

  function renderYear() {
    elBoard.appendChild(boardHead(state.year + ' 年', false));

    var bars = HIST.yearBars(state.year);
    var max = 1;
    bars.forEach(function (b) { if (b.sets > max) max = b.sets; });

    var wrap = el('div', 'year-bars');
    bars.forEach(function (b) {
      var col = document.createElement('button');
      col.type = 'button';
      col.className = 'year-col' + (b.sets ? '' : ' is-empty') +
        (b.ym === todayKey.slice(0, 7) ? ' is-now' : '');
      col.setAttribute('aria-label',
        b.month + ' 月，' + b.sets + ' 组，' + b.days + ' 天有记录' +
        (b.sealed ? '，' + b.sealed + ' 天已封存' : ''));
      col.addEventListener('click', function () {
        state.range = 'month';
        state.ym = b.ym;
        state.openDate = null;
        render();
      });

      col.appendChild(el('span', 'year-num', b.sets ? String(b.sets) : ''));
      var track = el('div', 'year-track');
      var bar = el('div', 'year-bar');
      // 高 = 当月组数 ÷ 全年最多的一月。0 就是 0，不给下限撑着。
      // 高度是数据（直接写死），入场只用 transform —— 动 height 会反复触发布局
      bar.style.height = b.sets ? Math.max(3, Math.round(b.sets / max * 100)) + '%' : '0';
      bar.style.transform = 'scaleY(0)';
      requestAnimationFrame(function () { bar.style.transform = 'scaleY(1)'; });
      track.appendChild(bar);
      col.appendChild(track);
      col.appendChild(el('span', 'year-month', String(b.month)));
      wrap.appendChild(col);
    });
    elBoard.appendChild(wrap);
    elBoard.appendChild(el('p', 'board-sub', '柱子高度 = 那个月完成的组数，12 栏共用同一条轴。点一栏看那个月的环历。'));
  }

  function renderYears() {
    elBoard.appendChild(boardHead('全部记录', false));

    var list = HIST.years();
    if (!list.length) {
      elBoard.appendChild(el('p', 'board-empty',
        '还没有任何记录。今天练完，在首页按一下「封存今天的清单」，这里就会长出第一枚印。'));
      return;
    }

    var wrap = el('div', 'year-rows');
    list.forEach(function (y) {
      var st = HIST.stats(HIST.year(y));
      var top = heaviest(HIST.year(y));

      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'year-row';
      row.setAttribute('aria-label', y + ' 年，' + st.days + ' 天，' + st.doneSets + ' 组');
      row.addEventListener('click', function () {
        state.range = 'year';
        state.year = y;
        state.openDate = null;
        render();
      });

      var left = el('span', 'year-row-year', y);
      var mid = el('span', 'year-row-nums');
      mid.appendChild(el('b', null, String(st.days)));
      mid.appendChild(el('i', null, '天'));
      mid.appendChild(el('b', null, String(st.doneSets)));
      mid.appendChild(el('i', null, '组'));
      if (top) {
        mid.appendChild(el('b', null, fmtKg(top.value)));
        mid.appendChild(el('i', null, 'kg'));
      }
      row.appendChild(left);
      row.appendChild(mid);
      row.appendChild(el('span', 'year-row-go', '›'));
      wrap.appendChild(row);
    });
    elBoard.appendChild(wrap);
  }

  function renderBoard() {
    elBoard.innerHTML = '';
    if (state.range === 'month') renderMonth();
    else if (state.range === 'year') renderYear();
    else renderYears();
  }

  /* --------------------------------------------------------------------
     某一天的清单
     -------------------------------------------------------------------- */
  function renderSheet() {
    if (!state.openDate) { elSheet.hidden = true; elSheet.innerHTML = ''; return; }

    var cell = HIST.dayCell(state.openDate);
    var session = HIST.get(state.openDate);

    elSheet.hidden = false;
    elSheet.innerHTML = '';

    var head = el('div', 'sheet-head');
    var title = el('div', 'sheet-titles');
    title.appendChild(el('h3', 'sheet-date', cnDate(cell.date) + ' · ' + weekdayOf(cell.date)));
    var tags = el('div', 'sheet-tags');
    tags.appendChild(el('span', 'sheet-tag' + (cell.sealed ? ' is-on' : ''),
      cell.sealed ? '已封存 ' + timeOf(cell.sealedAt) : (cell.has ? '还没封存' : '没有记录')));
    if (session && session.focusKey) {
      var g = window.FIT ? window.FIT.groupByKey(session.focusKey) : null;
      if (g) tags.appendChild(el('span', 'sheet-tag', g.label));
    }
    title.appendChild(tags);
    head.appendChild(title);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'sheet-close';
    close.setAttribute('aria-label', '收起这天的清单');
    close.textContent = '✕';
    close.addEventListener('click', function () {
      state.openDate = null;
      renderBoard();
      renderSheet();
    });
    head.appendChild(close);
    elSheet.appendChild(head);

    if (!cell.has) {
      elSheet.appendChild(el('p', 'sheet-empty', '这天没有记录。'));
      return;
    }

    var rows = el('div', 'sheet-rows');
    (session.entries || []).forEach(function (e) {
      if (!e || !e.exId) return;
      var sets = +e.sets || 0;
      var done = Math.min(+e.done || 0, sets);

      var row = el('div', 'sheet-row');
      row.appendChild(el('span', 'sheet-ex', HIST.exerciseName(e.exId)));
      var sets_ = el('span', 'sheet-sets');
      sets_.appendChild(el('b', null, String(done)));
      sets_.appendChild(el('i', null, ' / ' + sets + ' 组'));
      row.appendChild(sets_);
      row.appendChild(el('span', 'sheet-kg',
        (e.weight == null || e.weight === '') ? '—' : fmtKg(parseFloat(e.weight)) + ' kg'));
      rows.appendChild(row);
    });
    elSheet.appendChild(rows);

    var foot = el('p', 'sheet-foot');
    foot.appendChild(el('span', null, '共 ' + cell.done + ' 组 · ' + cell.actions + ' 个动作'));
    if (cell.done < cell.sets) {
      foot.appendChild(el('span', 'sheet-warn', '（安排了 ' + cell.sets + ' 组，做了 ' + cell.done + ' 组）'));
    }
    elSheet.appendChild(foot);

    // 删掉这一天的记录。破坏性动作静止时不喊叫，只在 hover 时转成警示色
    var actions = el('div', 'sheet-actions');
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'link-danger';
    del.textContent = '删除这天的记录';
    del.addEventListener('click', function () { deleteDay(cell.date); });
    actions.appendChild(del);
    elSheet.appendChild(actions);
  }

  /* --------------------------------------------------------------------
     删除
     --------------------------------------------------------------------------
     一个必须处理的坑：把"今天"的记录删掉之后，首页工作区（fit-plan-v1）里
     还留着那几张动作卡，随便点一下圆点就会把这一天重新写回日志。
     所以删今天 = 连工作区一起清空（首页会回到 4 张空卡片）。
     -------------------------------------------------------------------- */
  var KEY_PLAN = 'fit-plan-v1';

  function dropWorkspaceIfToday(date) {
    if (date !== todayKey) return;
    try { localStorage.removeItem(KEY_PLAN); } catch (e) { /* 忽略 */ }
  }

  function deleteDay(date) {
    var cell = HIST.dayCell(date);
    if (!cell.has) return;

    var msg = '删除 ' + cnDate(date) + ' 的记录？\n' +
      cell.actions + ' 个动作 · ' + cell.done + ' 组' +
      (cell.sealed ? ' · 已封存 ' + timeOf(cell.sealedAt) : '') +
      '，删掉就拿不回来了。' +
      (date === todayKey ? '\n\n今天首页上的动作卡也会一起清空。' : '');
    if (!window.confirm(msg)) return;

    HIST.remove(date);
    dropWorkspaceIfToday(date);
    state.openDate = null;
    render();
  }

  /* 当前区间里的记录清空（本月 / 本年 / 全部） */
  function renderDanger() {
    elDanger.innerHTML = '';

    var list = sessionsOf();
    if (!list.length) return;

    var label = state.range === 'month' ? cnMonth(state.ym)
      : (state.range === 'year' ? state.year + ' 年' : '全部');
    var hadToday = list.some(function (s) { return s.date === todayKey; });

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'link-danger';
    b.textContent = '清空' + label + '的记录（' + list.length + ' 天）';
    b.addEventListener('click', function () {
      var msg = '清空' + label + '的 ' + list.length + ' 天记录？\n' +
        '这些清单和重量会一起消失，拿不回来。' +
        (state.range === 'all' ? '\n\n这是全部记录，删完历史页会回到空白。' : '') +
        (state.range !== 'all' && hadToday ? '\n\n今天首页上的动作卡也会一起清空。' : '');
      if (!window.confirm(msg)) return;

      var from = state.range === 'month' ? state.ym + '-01'
        : (state.range === 'year' ? state.year + '-01-01' : null);
      var to = state.range === 'month' ? state.ym + '-31'
        : (state.range === 'year' ? state.year + '-12-31' : null);

      var n = HIST.removeRange(from, to);
      if (n && hadToday) dropWorkspaceIfToday(todayKey);
      state.openDate = null;
      render();
    });

    elDanger.appendChild(b);
    elDanger.appendChild(el('p', 'danger-note',
      '删除是彻底删除，只影响这台设备上的记录，没有云端备份可以恢复。'));
  }

  /* --------------------------------------------------------------------
     销轨：一个动作一行水平凹槽，孔位是 kg，销子停在最近一次
     -------------------------------------------------------------------- */
  function renderRails() {
    var list = sessionsOf();
    var rows = HIST.rails(list);

    elRails.innerHTML = '';
    var head = el('div', 'rails-head');
    head.appendChild(el('h2', 'rails-title', '重量'));
    elRails.appendChild(head);

    if (!rows.length) {
      elRails.appendChild(el('p', 'rails-empty',
        '这段区间还没有记过重量。在首页的动作卡上填一个 kg，它就会出现在这里。'));
      return;
    }

    var axis = 1;
    rows.forEach(function (r) { if (r.max > axis) axis = r.max; });

    elRails.appendChild(el('p', 'rails-sub',
      '销子 = 最近一次 · 刻痕 = 最重的一次 · 一条轴到 ' + fmtKg(axis) + ' kg，动作之间可以直接比'));

    var wrap = el('div', 'rail-list');
    rows.forEach(function (r) {
      var row = el('div', 'rail');

      var top = el('div', 'rail-top');
      top.appendChild(el('span', 'rail-name', r.name));
      var nums = el('span', 'rail-nums');
      nums.appendChild(el('b', 'rail-last', fmtKg(r.last)));
      nums.appendChild(el('i', 'rail-unit', 'kg 最近'));
      nums.appendChild(el('span', 'rail-max', '最重 ' + fmtKg(r.max) + ' kg'));
      top.appendChild(nums);
      row.appendChild(top);

      var track = el('div', 'rail-track');
      if (r.max > 0) {
        var notch = el('div', 'rail-notch');
        notch.style.left = Math.min(100, r.max / axis * 100) + '%';
        track.appendChild(notch);
        var pin = el('div', 'rail-pin');
        pin.style.left = Math.min(100, r.last / axis * 100) + '%';
        track.appendChild(pin);
      }
      row.appendChild(track);
      wrap.appendChild(row);
    });
    elRails.appendChild(wrap);
  }

  /* --------------------------------------------------------------------
     渲染
     -------------------------------------------------------------------- */
  function render() {
    renderSwitch();
    renderLedger();
    renderBoard();
    renderSheet();
    renderRails();
    renderDanger();

    elLegend.textContent = state.range === 'month'
      ? '环粗细与环下小字 = 那天的组数 · 闭合 = 已封存 · 开口 = 还没封存 · 空槽 = 没练'
      : (state.range === 'year'
        ? '柱高 = 当月组数 · 点一栏看那个月的环历'
        : '点一年看那一年的 12 栏柱阵');
  }

  /* 浏览器不给本地存储时（隐私模式、极旧的引擎、file:// 被限制），
     这一页会空白——但空白不等于"你没练"。必须把原因说出来。 */
  (function () {
    var ok = true;
    try {
      localStorage.setItem('__hist_test__', '1');
      localStorage.removeItem('__hist_test__');
    } catch (e) { ok = false; }
    if (ok) return;
    var warn = el('p', 'history-note history-warn',
      '当前浏览器不允许本地存储，读不到任何训练日志。' +
      '建议用 Chrome / Edge 打开，或把网站部署到线上再用。');
    elBoard.parentNode.insertBefore(warn, elBoard);
  })();

  // 从别的页面返回时（浏览器 bfcache）重新读一次，天数不会停在昨天
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    todayKey = HIST.todayKey();
    render();
  });

  render();
})();
