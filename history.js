/* ==========================================================================
   训练日志 —— 时间胶囊的地基
   --------------------------------------------------------------------------
   `fit-plan-v1` 仍然是"今天的工作区"（可改、按天重置），
   这个文件负责把它沉淀成一份只增不减的日志，供每日卡片和月/年总结使用。

   设计要点：
     · 键是日期（YYYY-MM-DD），所以同一天多次写入天然幂等，不会重复
     · 只增不减：过了那天就冻结，不再被覆盖
     · 容量：一天约 120 字节 → 一年 ≈ 44 KB → 十年 ≈ 440 KB，撑不爆 localStorage
     · 不碰 fit-plan-v1，旧数据原样保留，随时可以回退
   ========================================================================== */

window.HIST = (function () {
  'use strict';

  var KEY = 'fit-history-v1';
  var LEGACY = 'fit-plan-v1';
  var VERSION = 1;

  /* --------------------------------------------------------------------
     日期工具
     统一用零填充的 YYYY-MM-DD。字符串直接比大小就是按时间排序，
     按月/按年筛选也就是前缀匹配。
     -------------------------------------------------------------------- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // 兼容早期没补零的格式（2026-9-16），让今天的旧记录不会因为改格式而丢
  function normalizeDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || ''));
    if (!m) return null;
    return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  }

  /* --------------------------------------------------------------------
     读写
     -------------------------------------------------------------------- */

  function empty() { return { version: VERSION, sessions: {} }; }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !data.sessions) return empty();
      return data;
    } catch (e) {
      return empty();
    }
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 写入/更新某一天。同一天反复调用只会覆盖同一条。
  function upsert(session) {
    if (!session || !session.date) return false;
    var data = read();
    data.sessions[session.date] = session;
    return write(data);
  }

  function remove(date) {
    var d = normalizeDate(date);
    if (!d) return false;
    var data = read();
    if (!data.sessions[d]) return false;
    delete data.sessions[d];
    return write(data);
  }

  function get(date) {
    var d = normalizeDate(date);
    return d ? (read().sessions[d] || null) : null;
  }

  /* 删掉一段区间（含两端）里的记录，返回删掉的条数。
     传空值 = 那一端不限。历史页的「清空本月 / 本年 / 全部」用它。 */
  function removeRange(from, to) {
    var data = read();
    var hit = Object.keys(data.sessions).filter(function (d) {
      return (!from || d >= from) && (!to || d <= to);
    });
    if (!hit.length) return 0;
    hit.forEach(function (d) { delete data.sessions[d]; });
    return write(data) ? hit.length : 0;
  }

  // 日期区间（含两端），按日期升序
  function range(from, to) {
    var s = read().sessions;
    return Object.keys(s).filter(function (d) {
      return (!from || d >= from) && (!to || d <= to);
    }).sort().map(function (d) { return s[d]; });
  }

  // ym 形如 '2026-09'
  function month(ym) { return range(ym + '-01', ym + '-31'); }

  // y 形如 '2026'
  function year(y) { return range(y + '-01-01', y + '-12-31'); }

  function all() { return range(); }

  function latest(n) { return all().slice(-(n || 1)); }

  // 最近 n 天里，哪些天有记录 —— 给每日卡片的条带用
  function recentDays(n) {
    var out = [], d = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var t = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
      var key = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
      var s = get(key);
      var sets = 0;
      if (s && Array.isArray(s.entries)) {
        s.entries.forEach(function (e) { sets += (+e.done || 0); });
      }
      out.push({ date: key, sets: sets, trained: sets > 0 });
    }
    return out;
  }

  /* --------------------------------------------------------------------
     聚合：把若干天的记录算成一个总结
     每日卡片、月总结、年总结都用这一个函数。
     -------------------------------------------------------------------- */

  function exerciseName(exId) {
    var list = (typeof window !== 'undefined' && window.EXERCISES) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === exId) return list[i].name;
    return exId;
  }

  function muscleOf(exId) {
    var list = (typeof window !== 'undefined' && window.EXERCISES) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === exId) return list[i].primaryMuscle;
    return '';
  }

  function stats(sessions) {
    var out = {
      days: 0, totalSets: 0, doneSets: 0, entries: 0, sealedDays: 0,
      byMuscle: {}, byExercise: {},
      firstDate: null, lastDate: null,
      weights: {}                       // exId -> { max, last, lastDate }
    };

    (sessions || []).forEach(function (s) {
      var list = (s.entries || []).filter(function (e) { return e && e.exId; });
      if (!list.length) return;

      out.days++;
      if (s.sealedAt) out.sealedDays++;
      if (!out.firstDate || s.date < out.firstDate) out.firstDate = s.date;
      if (!out.lastDate || s.date > out.lastDate) out.lastDate = s.date;

      list.forEach(function (e) {
        var sets = +e.sets || 0;
        var done = Math.min(+e.done || 0, sets);
        out.totalSets += sets;
        out.doneSets += done;
        out.entries++;

        var muscle = muscleOf(e.exId) || '其他';
        out.byMuscle[muscle] = (out.byMuscle[muscle] || 0) + sets;

        var box = out.byExercise[e.exId] || (out.byExercise[e.exId] = {
          exId: e.exId, name: exerciseName(e.exId), sets: 0, done: 0, days: 0
        });
        box.sets += sets;
        box.done += done;
        box.days++;

        var w = parseFloat(e.weight);
        if (isFinite(w) && w > 0) {
          var rec = out.weights[e.exId] || (out.weights[e.exId] = { max: 0, last: 0, lastDate: null, name: exerciseName(e.exId) });
          if (w > rec.max) rec.max = w;
          if (!rec.lastDate || s.date >= rec.lastDate) { rec.last = w; rec.lastDate = s.date; }
        }
      });
    });

    // 练得最多的动作排前面
    out.topExercises = Object.keys(out.byExercise).map(function (k) {
      return out.byExercise[k];
    }).sort(function (a, b) { return b.sets - a.sets; });

    return out;
  }

  /* --------------------------------------------------------------------
     封存
     --------------------------------------------------------------------------
     用户的工作方式：**做完全部动作，才输出一张今天的清单**。
     所以日志里的一天有两种状态：
       · 只写了 save() 的自动草稿 —— 开口的弧，还开着（哪怕已经过了那天）
       · 被显式封存过的      —— 闭合的印，日期旁边记下封存时刻
     `save()` 照旧自动写日志（那是防丢的安全网），封存只是再盖一个时间戳。
     -------------------------------------------------------------------- */

  function seal(date) {
    var d = normalizeDate(date) || todayKey();
    var data = read();
    var s = data.sessions[d];
    if (!s) return null;                       // 还没有任何记录的一天不许盖印
    s.sealedAt = Date.now();
    s.updatedAt = s.updatedAt || s.sealedAt;
    return write(data) ? s : null;
  }

  function unseal(date) {
    var d = normalizeDate(date);
    if (!d) return false;
    var data = read();
    var s = data.sessions[d];
    if (!s || !s.sealedAt) return false;
    delete s.sealedAt;
    return write(data);
  }

  function isSealed(date) {
    var s = get(date);
    return !!(s && s.sealedAt);
  }

  /* --------------------------------------------------------------------
     一天的格子：月历里每一枚环都用这一个函数
     -------------------------------------------------------------------- */

  function dayCell(date) {
    var s = get(date);
    var sets = 0, done = 0, actions = 0;
    if (s && Array.isArray(s.entries)) {
      s.entries.forEach(function (e) {
        if (!e || !e.exId) return;
        var ts = +e.sets || 0;
        sets += ts;
        done += Math.min(+e.done || 0, ts);
        actions++;
      });
    }
    return {
      date: date, day: +date.slice(8), sets: sets, done: done, actions: actions,
      has: actions > 0, sealed: !!(s && s.sealedAt),
      sealedAt: (s && s.sealedAt) || null, today: date === todayKey()
    };
  }

  /* 一个月的格子（周一开头），前导空格用 null 占位 */
  function monthCells(ym) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m) return [];
    var y = +m[1], mo = +m[2];
    var total = new Date(y, mo, 0).getDate();
    var lead = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
    var out = [];
    for (var i = 0; i < lead; i++) out.push(null);
    for (var d = 1; d <= total; d++) out.push(dayCell(y + '-' + pad(mo) + '-' + pad(d)));
    return out;
  }

  /* 一年的 12 栏：每栏一个月的完成组数与训练天数 */
  function yearBars(y) {
    var out = [];
    for (var i = 1; i <= 12; i++) {
      var ym = y + '-' + pad(i);
      var list = month(ym);
      var cells = { sets: 0, days: 0, sealed: 0 };
      list.forEach(function (s) {
        var c = dayCell(s.date);
        if (!c.has) return;
        cells.sets += c.done;
        cells.days++;
        if (c.sealed) cells.sealed++;
      });
      out.push({ ym: ym, month: i, sets: cells.sets, days: cells.days, sealed: cells.sealed });
    }
    return out;
  }

  /* 有记录的年份，从新到旧 */
  function years() {
    var seen = {}, out = [];
    Object.keys(read().sessions).forEach(function (d) {
      var y = d.slice(0, 4);
      if (!seen[y]) { seen[y] = true; out.push(y); }
    });
    return out.sort().reverse();
  }

  /* 与 from..to 等长、紧邻它前面的那一段（用来做中性对比） */
  function prevRange(from, to) {
    function t(s) { return new Date(s + 'T00:00:00').getTime(); }
    function f(ms) {
      var d = new Date(ms);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }
    var len = Math.round((t(to) - t(from)) / 86400000) + 1;
    var end = t(from) - 86400000;
    return { from: f(end - (len - 1) * 86400000), to: f(end), days: len };
  }

  /* 一段区间里完成的组数（对比句和柱阵都用它） */
  function sumDone(sessions) {
    var n = 0;
    (sessions || []).forEach(function (s) {
      var c = dayCell(s.date);
      n += c.done;
    });
    return n;
  }

  /* 每个动作的销轨：最近一次与最重的一次 */
  function rails(sessions) {
    var map = {};
    (sessions || []).forEach(function (s) {
      (s.entries || []).forEach(function (e) {
        if (!e || !e.exId) return;
        var w = parseFloat(e.weight);
        if (!isFinite(w) || w <= 0) return;
        var r = map[e.exId] || (map[e.exId] = {
          exId: e.exId, name: exerciseName(e.exId), muscle: muscleOf(e.exId),
          last: 0, lastDate: null, max: 0, maxDate: null, times: 0
        });
        r.times++;
        if (!r.lastDate || s.date >= r.lastDate) { r.last = w; r.lastDate = s.date; }
        if (w > r.max) { r.max = w; r.maxDate = s.date; }
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.times - a.times || b.max - a.max; });
  }

  /* --------------------------------------------------------------------
     迁移：把 fit-plan-v1 里那条推进日志，只做一次。
     不动 fit-plan-v1，旧版本随时能用。
     -------------------------------------------------------------------- */

  function migrate() {
    if (read().migrated) return 'already';
    var raw;
    try { raw = localStorage.getItem(LEGACY); } catch (e) { return 'error'; }
    if (!raw) { var d0 = empty(); d0.migrated = true; write(d0); return 'nothing'; }

    var data;
    try { data = JSON.parse(raw); } catch (e) { return 'error'; }
    var date = normalizeDate(data && data.date);
    if (!date || !Array.isArray(data.items)) { var d1 = empty(); d1.migrated = true; write(d1); return 'nothing'; }

    var list = data.items.filter(function (it) { return it && it.exId; }).map(function (it) {
      return { exId: it.exId, sets: +it.sets || 0, done: +it.done || 0, weight: it.weight == null ? null : +it.weight };
    });

    var store = read();
    store.migrated = true;
    if (list.length) {
      store.sessions[date] = {
        date: date,
        focusKey: data.focusKey || '',
        entries: list,
        updatedAt: Date.now(),
        firstOpenedAt: null
      };
    }
    write(store);
    return list.length ? 'migrated ' + date : 'nothing';
  }

  return {
    VERSION: VERSION,
    KEY: KEY,
    todayKey: todayKey,
    normalizeDate: normalizeDate,
    read: read,
    upsert: upsert,
    remove: remove,
    removeRange: removeRange,
    get: get,
    range: range,
    month: month,
    year: year,
    all: all,
    latest: latest,
    recentDays: recentDays,
    stats: stats,
    migrate: migrate,
    /* 封存 */
    seal: seal,
    unseal: unseal,
    isSealed: isSealed,
    /* 给历史页用的聚合 */
    dayCell: dayCell,
    monthCells: monthCells,
    yearBars: yearBars,
    years: years,
    prevRange: prevRange,
    sumDone: sumDone,
    rails: rails,
    exerciseName: exerciseName,
    muscleOf: muscleOf
  };
})();
