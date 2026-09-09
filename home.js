/* ==========================================================================
   首页逻辑 —— 大分类卡片 + 即时搜索建议
   分类定义在 search-core.js 的 GROUPS，和计划页共用
   ========================================================================== */

(function () {
  'use strict';

  var FIT = window.FIT;
  var GROUPS = FIT.groups;

  /* 次要入口（数据里有、但不放进大卡片） */
  var MORE = [
    { label: '练手臂', muscles: ['手臂'] },
    { label: '练全身', muscles: ['全身'] },
    { label: '看全部动作', all: true }
  ];

  var elGrid   = document.getElementById('big-grid');
  var elMore   = document.getElementById('more-links');
  var elInput  = document.getElementById('q');
  var elSugg   = document.getElementById('suggest');

  // ---------- 生成跳转地址 ----------
  function hrefOf(g) {
    if (g.all) return 'search.html';
    if (g.category) return 'search.html?category=' + encodeURIComponent(g.category);
    return 'search.html?muscles=' + encodeURIComponent(g.muscles.join(','));
  }

  // ---------- 渲染大卡片 ----------
  function renderGroups() {
    GROUPS.forEach(function (g) {
      var a = document.createElement('a');
      a.className = 'big-card tone-' + g.tone;
      a.href = hrefOf(g);

      var emoji = document.createElement('span');
      emoji.className = 'big-emoji';
      emoji.textContent = g.emoji;

      var label = document.createElement('span');
      label.className = 'big-label';
      label.textContent = g.label;

      var count = document.createElement('span');
      count.className = 'big-count';
      count.textContent = FIT.countGroup(g) + ' 个动作';

      a.appendChild(emoji);
      a.appendChild(label);
      a.appendChild(count);
      elGrid.appendChild(a);
    });
  }

  // ---------- 渲染次要入口 ----------
  function renderMore() {
    MORE.forEach(function (g, idx) {
      if (idx > 0) {
        var sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '·';
        elMore.appendChild(sep);
      }
      var a = document.createElement('a');
      a.href = hrefOf(g);
      a.textContent = g.label;
      elMore.appendChild(a);
    });
  }

  // ---------- 即时搜索建议 ----------
  var suggestItems = [];
  var activeIndex = -1;

  function hideSuggest() {
    elSugg.hidden = true;
    elSugg.innerHTML = '';
    suggestItems = [];
    activeIndex = -1;
  }

  function showSuggest() {
    var q = elInput.value.trim();
    if (!q) { hideSuggest(); return; }

    var results = FIT.search(q).slice(0, 6);
    suggestItems = results;
    activeIndex = -1;

    elSugg.innerHTML = '';

    if (!results.length) {
      var none = document.createElement('div');
      none.className = 'suggest-empty';
      none.textContent = '没有找到「' + q + '」，回车看看完整结果';
      elSugg.appendChild(none);
      elSugg.hidden = false;
      return;
    }

    results.forEach(function (entry, idx) {
      var item = entry.item;
      var a = document.createElement('a');
      a.className = 'suggest-item';
      a.href = 'exercise.html?id=' + encodeURIComponent(item.id);
      a.dataset.index = idx;

      var name = document.createElement('span');
      name.className = 'suggest-name';
      name.textContent = item.name;

      var meta = document.createElement('span');
      meta.className = 'suggest-meta';
      var bits = [item.primaryMuscle, item.difficulty];
      (item.equipment || []).forEach(function (e) { bits.push(e); });
      meta.textContent = bits.filter(Boolean).join(' · ');

      a.appendChild(name);
      a.appendChild(meta);
      elSugg.appendChild(a);
    });

    var all = document.createElement('a');
    all.className = 'suggest-all';
    all.href = 'search.html?q=' + encodeURIComponent(q);
    all.textContent = '查看全部结果 →';
    elSugg.appendChild(all);

    elSugg.hidden = false;
  }

  function highlight() {
    var nodes = elSugg.querySelectorAll('.suggest-item');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('active', i === activeIndex);
    }
  }

  // ---------- 事件 ----------
  elInput.addEventListener('input', showSuggest);

  elInput.addEventListener('focus', function () {
    if (elInput.value.trim()) showSuggest();
  });

  elInput.addEventListener('keydown', function (e) {
    if (elSugg.hidden) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, suggestItems.length - 1);
      highlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      highlight();
    } else if (e.key === 'Enter' && activeIndex > -1) {
      e.preventDefault();
      window.location.href = 'exercise.html?id=' +
        encodeURIComponent(suggestItems[activeIndex].item.id);
    } else if (e.key === 'Escape') {
      hideSuggest();
    }
  });

  document.addEventListener('click', function (e) {
    if (!elSugg.contains(e.target) && e.target !== elInput) hideSuggest();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== elInput) {
      e.preventDefault();
      elInput.focus();
    }
  });

  // ---------- 启动 ----------
  renderGroups();
  renderMore();
})();
