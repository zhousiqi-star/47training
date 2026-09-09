/* ==========================================================================
   动作详情页逻辑 —— 一般不需要改动
   地址格式：exercise.html?id=动作的id
   ========================================================================== */

(function () {
  'use strict';

  var DATA = window.EXERCISES || [];
  var root = document.getElementById('detail');

  function getId() {
    var m = /[?&]id=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : '';
  }

  var id = getId();
  var item = null;
  for (var i = 0; i < DATA.length; i++) {
    if (DATA[i].id === id) { item = DATA[i]; break; }
  }

  // 页面标题跟着动作名走
  document.title = item
    ? (item.name + ' · 47的健身小帮手')
    : '未找到动作 · 47的健身小帮手';

  // 清掉「加载中」
  var loading = root.querySelector('.empty');
  if (loading) loading.remove();

  if (!item) {
    var miss = document.createElement('p');
    miss.className = 'empty';
    miss.innerHTML = '<strong>没有找到这个动作</strong>可能是链接不完整，请返回搜索页重新选择。';
    root.appendChild(miss);
    return;
  }

  // ---------- 标题与标签 ----------
  var h2 = document.createElement('h2');
  h2.textContent = item.name;
  root.appendChild(h2);

  var meta = document.createElement('div');
  meta.className = 'meta';

  var tags = [item.primaryMuscle, item.difficulty, item.category, item.metrics ? '计量：' + item.metrics : ''];
  (item.equipment || []).forEach(function (e) { tags.push(e); });

  tags.forEach(function (t, idx) {
    if (!t) return;
    var span = document.createElement('span');
    span.className = 'tag' + (idx === 0 ? ' primary' : '');
    span.textContent = t;
    meta.appendChild(span);
  });
  root.appendChild(meta);

  var secondary = (item.secondaryMuscles || []).filter(Boolean);
  if (secondary.length) {
    var sec = document.createElement('p');
    sec.className = 'aliases';
    sec.textContent = '次要肌群：' + secondary.join('、');
    root.appendChild(sec);
  }

  var aliases = (item.aliases || []).filter(Boolean);
  if (aliases.length) {
    var al = document.createElement('p');
    al.className = 'aliases';
    al.textContent = '别名：' + aliases.join('、');
    root.appendChild(al);
  }

  // ---------- 视频 ----------
  if (item.video) {
    var vPanel = panel('示范视频');
    var link = document.createElement('a');
    link.className = 'video-link';
    link.href = item.video;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = '打开示范视频 →';
    vPanel.appendChild(link);
    root.appendChild(vPanel);
  }

  // ---------- 步骤 ----------
  if (item.steps && item.steps.length) {
    var sPanel = panel('动作步骤');
    var ol = document.createElement('ol');
    item.steps.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      ol.appendChild(li);
    });
    sPanel.appendChild(ol);
    root.appendChild(sPanel);
  }

  // ---------- 常见错误 ----------
  if (item.mistakes && item.mistakes.length) {
    var mPanel = panel('常见错误');
    var ul = document.createElement('ul');
    item.mistakes.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    });
    mPanel.appendChild(ul);
    root.appendChild(mPanel);
  }

  // ---------- 提示 ----------
  if (item.tips && item.tips.length) {
    var tPanel = panel('训练提示');
    var tul = document.createElement('ul');
    item.tips.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      tul.appendChild(li);
    });
    tPanel.appendChild(tul);
    root.appendChild(tPanel);
  }

  // ---------- 禁忌 / 注意事项 ----------
  if (item.contraindication) {
    var wPanel = panel('注意事项', true);
    var wp = document.createElement('p');
    wp.textContent = item.contraindication;
    wPanel.appendChild(wp);
    root.appendChild(wPanel);
  }

  // ---------- 工具函数 ----------
  function panel(title, isWarn) {
    var div = document.createElement('div');
    div.className = 'panel' + (isWarn ? ' warn' : '');
    var h3 = document.createElement('h3');
    h3.textContent = title;
    div.appendChild(h3);
    return div;
  }
})();
