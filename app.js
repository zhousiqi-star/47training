/* ==========================================================================
   搜索页逻辑
   - 支持从首页跳转过来的地址参数：?q=  ?muscles=腿,臀  ?equipment=哑铃  ?difficulty=入门  ?category=有氧
   - 搜索和筛选都是即时的，不用点按钮
   ========================================================================== */

(function () {
  'use strict';

  var FIT = window.FIT;

  var FILTERS = [
    { key: 'primaryMuscle', label: '肌群' },
    { key: 'equipment',     label: '器械' },
    { key: 'difficulty',    label: '难度' },
    { key: 'category',      label: '类别' }
  ];

  var state = { q: '', active: {} };
  FILTERS.forEach(function (f) { state.active[f.key] = new Set(); });

  var chipEls = {};        // chipEls[字段][选项值] = 按钮元素
  var optionsIndex = {};   // 用于校验地址参数是否合法

  // ---------- DOM ----------
  var elInput   = document.getElementById('q');
  var elForm    = elInput.form;
  var elFilters = document.getElementById('filters');
  var elResults = document.getElementById('results');
  var elCount   = document.getElementById('count');
  var elEmpty   = document.getElementById('empty');
  var elReset   = document.getElementById('reset');

  // ---------- 地址参数 ----------
  function getParams() {
    var out = {};
    var raw = window.location.search.replace(/^\?/, '');
    if (!raw) return out;

    raw.split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = i < 0 ? pair : pair.slice(0, i);
      var v = i < 0 ? '' : pair.slice(i + 1);
      out[decodeURIComponent(k.replace(/\+/g, ' '))] =
        decodeURIComponent(v.replace(/\+/g, ' '));
    });
    return out;
  }

  function splitList(v) {
    return String(v || '').split(',').map(function (s) {
      return s.trim();
    }).filter(Boolean);
  }

  function applyParams() {
    var p = getParams();

    if (p.q) {
      state.q = p.q;
      elInput.value = p.q;
    }

    // muscles / muscle 都支持，逗号分隔可以多选
    var muscles = splitList(p.muscles).concat(splitList(p.muscle));
    muscles.forEach(function (v) { select('primaryMuscle', v); });

    splitList(p.equipment).forEach(function (v) { select('equipment', v); });
    splitList(p.difficulty).forEach(function (v) { select('difficulty', v); });
    splitList(p.category).forEach(function (v) { select('category', v); });
  }

  // 只有选项真实存在时才选中，避免手改地址导致空白页
  function select(key, value) {
    if (!optionsIndex[key] || optionsIndex[key].indexOf(value) === -1) return;
    state.active[key].add(value);
    var btn = chipEls[key] && chipEls[key][value];
    if (btn) btn.classList.add('active');
  }

  function syncUrl() {
    var parts = [];
    if (state.q.trim()) parts.push('q=' + encodeURIComponent(state.q.trim()));

    if (state.active.primaryMuscle.size) {
      parts.push('muscles=' + encodeURIComponent(
        Array.from(state.active.primaryMuscle).join(',')));
    }
    ['equipment', 'difficulty', 'category'].forEach(function (key) {
      if (state.active[key].size) {
        parts.push(key + '=' + encodeURIComponent(
          Array.from(state.active[key]).join(',')));
      }
    });

    var url = 'search.html' + (parts.length ? '?' + parts.join('&') : '');
    try {
      window.history.replaceState(null, '', url);
    } catch (e) {
      /* 本地双击打开时部分浏览器不允许改地址，忽略即可 */
    }
  }

  // ---------- 筛选 ----------
  function valuesOf(item, key) {
    return FIT.asArray(item[key]).map(String);
  }

  function passFilters(item) {
    for (var i = 0; i < FILTERS.length; i++) {
      var key = FILTERS[i].key;
      var selected = state.active[key];
      if (selected.size === 0) continue;

      var ok = false;
      valuesOf(item, key).forEach(function (v) {
        if (selected.has(v)) ok = true;
      });
      if (!ok) return false;
    }
    return true;
  }

  // ---------- 构建筛选器 ----------
  function buildFilters() {
    FILTERS.forEach(function (f) {
      var options = [];
      FIT.data.forEach(function (item) {
        valuesOf(item, f.key).forEach(function (v) {
          if (options.indexOf(v) === -1) options.push(v);
        });
      });

      optionsIndex[f.key] = options;
      chipEls[f.key] = {};

      var row = document.createElement('div');
      row.className = 'filter-row';

      var label = document.createElement('span');
      label.className = 'filter-label';
      label.textContent = f.label;

      var chips = document.createElement('div');
      chips.className = 'chips';

      options.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.textContent = opt;

        btn.addEventListener('click', function () {
          var set = state.active[f.key];
          if (set.has(opt)) {
            set.delete(opt);
            btn.classList.remove('active');
          } else {
            set.add(opt);
            btn.classList.add('active');
          }
          render();
        });

        chipEls[f.key][opt] = btn;
        chips.appendChild(btn);
      });

      row.appendChild(label);
      row.appendChild(chips);
      elFilters.appendChild(row);
    });
  }

  // ---------- 渲染 ----------
  function render() {
    // 用共享内核做关键词过滤 + 排序，再叠加筛选条件
    var scored = FIT.search(state.q).filter(function (entry) {
      return passFilters(entry.item);
    });

    elResults.innerHTML = '';

    scored.forEach(function (entry) {
      elResults.appendChild(makeCard(entry.item));
    });

    var hasQuery = state.q.trim() !== '';
    var hasFilters = FILTERS.some(function (f) {
      return state.active[f.key].size > 0;
    });

    elEmpty.hidden = scored.length > 0;
    elReset.hidden = !(hasQuery || hasFilters);

    if (scored.length > 0) {
      elCount.innerHTML = '共 <strong>' + scored.length + '</strong> 个动作';
    } else {
      elCount.textContent = '';
    }

    syncUrl();
  }

  function makeCard(item) {
    var a = document.createElement('a');
    a.className = 'card';
    a.href = 'exercise.html?id=' + encodeURIComponent(item.id);

    var h3 = document.createElement('h3');
    h3.textContent = item.name;
    a.appendChild(h3);

    var meta = document.createElement('div');
    meta.className = 'meta';

    var tags = [item.primaryMuscle, item.difficulty, item.category];
    (item.equipment || []).forEach(function (e) { tags.push(e); });

    tags.forEach(function (t, idx) {
      if (!t) return;
      var span = document.createElement('span');
      span.className = 'tag' + (idx === 0 ? ' primary' : '');
      span.textContent = t;
      meta.appendChild(span);
    });
    a.appendChild(meta);

    var p = document.createElement('p');
    p.className = 'preview';
    p.textContent = (item.steps && item.steps[0]) ? item.steps[0] : '';
    a.appendChild(p);

    return a;
  }

  // ---------- 事件 ----------
  elInput.addEventListener('input', function () {
    state.q = elInput.value;
    render();
  });

  // 回车不跳转，保持当前筛选条件，直接就地刷新结果
  elForm.addEventListener('submit', function (e) {
    e.preventDefault();
    state.q = elInput.value;
    render();
  });

  elReset.addEventListener('click', function () {
    state.q = '';
    elInput.value = '';
    FILTERS.forEach(function (f) { state.active[f.key].clear(); });
    var active = elFilters.querySelectorAll('.chip.active');
    for (var i = 0; i < active.length; i++) active[i].classList.remove('active');
    render();
    elInput.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== elInput) {
      e.preventDefault();
      elInput.focus();
    }
  });

  // ---------- 启动 ----------
  buildFilters();
  applyParams();
  render();
})();
