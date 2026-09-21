/* ==========================================================================
   共享搜索内核 —— 首页和搜索页都用这一份逻辑
   必须在 exercises.js 之后引入
   ========================================================================== */

window.FIT = (function () {
  'use strict';

  var DATA = window.EXERCISES || [];

  // 字段权重：数字越大，命中后排序越靠前
  var FIELDS = [
    ['name', 100],
    ['aliases', 70],
    ['primaryMuscle', 50],
    ['secondaryMuscles', 30],
    ['equipment', 25],
    ['category', 20],
    ['difficulty', 15]
  ];

  function asArray(v) {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  }

  function tokenize(q) {
    return String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  }

  /* --------------------------------------------------------------------
     同义词表
     用户在搜索框里会写"练背""腹部""瘦腿""减脂"这类口语说法，
     这些词在数据里并不存在。这张表把它们翻译成数据里的正式字段值。
     想加新说法，往下面加一行就行。
     -------------------------------------------------------------------- */
  var SYNONYMS = {
    '腹': '核心', '腹部': '核心', '腹肌': '核心', '肚子': '核心',
    '腰腹': '核心', '练腹': '核心', '核心肌群': '核心',

    '胸肌': '胸', '胸部': '胸', '练胸': '胸',
    '背部': '背', '背肌': '背', '后背': '背', '练背': '背',
    '肩部': '肩', '三角肌': '肩', '练肩': '肩',
    '腿部': '腿', '大腿': '腿', '小腿': '腿', '练腿': '腿', '瘦腿': '腿',
    '屁股': '臀', '翘臀': '臀', '臀部': '臀', '练臀': '臀',
    '胳膊': '手臂', '二头肌': '手臂', '三头肌': '手臂',
    '练手臂': '手臂', '瘦手臂': '手臂',
    '减脂': '有氧', '燃脂': '有氧', '心肺': '有氧', '跑步': '有氧',
    '练全身': '全身', '瘦身': '全身',

    // 器械的旧叫法 → 数据里的正式值（正式值统一用「龙门架」）
    '拉力器': '龙门架'
  };

  // 把一个关键词展开成若干等价写法，任意一种命中都算命中
  function expand(token) {
    var out = [token];

    // 去掉"练/训练/想练/今天"这类前缀：练背 -> 背
    var stripped = token.replace(/^(今天|想|要|练|训练|锻炼|健身)+/, '');
    if (stripped && out.indexOf(stripped) === -1) out.push(stripped);

    var syn = SYNONYMS[token] || SYNONYMS[stripped];
    if (syn && out.indexOf(syn) === -1) out.push(syn);

    return out;
  }

  function rawTokenScore(item, token) {
    var best = 0;

    for (var i = 0; i < FIELDS.length; i++) {
      var parts = asArray(item[FIELDS[i][0]]);
      var weight = FIELDS[i][1];

      for (var j = 0; j < parts.length; j++) {
        var text = String(parts[j]).toLowerCase();
        if (!text) continue;

        if (text === token) {
          best = Math.max(best, weight + 40);
        } else if (text.indexOf(token) === 0) {
          best = Math.max(best, weight + 20);
        } else if (text.indexOf(token) > -1) {
          best = Math.max(best, weight);
        }
      }
    }
    return best;
  }

  function tokenScore(item, token) {
    var best = 0;
    var forms = expand(token);
    for (var i = 0; i < forms.length; i++) {
      var s = rawTokenScore(item, forms[i]);
      if (s > best) best = s;
    }
    return best;
  }

  // 每个关键词都必须命中至少一个字段，否则整体不匹配
  function scoreItem(item, tokens) {
    if (!tokens.length) return 1;
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var s = tokenScore(item, tokens[i]);
      if (s === 0) return 0;
      total += s;
    }
    return total;
  }

  function search(query) {
    var tokens = tokenize(query);
    var out = [];

    DATA.forEach(function (item) {
      var s = scoreItem(item, tokens);
      if (s > 0) out.push({ item: item, score: s });
    });

    out.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.name.localeCompare(b.item.name, 'zh');
    });

    return out;
  }

  // 统计某个字段等于某值的动作数量（用于首页卡片上的数字）
  function count(key, value) {
    var target = String(value);
    var n = 0;
    DATA.forEach(function (item) {
      var vals = asArray(item[key]).map(String);
      if (vals.indexOf(target) > -1) n++;
    });
    return n;
  }

  function findById(id) {
    for (var i = 0; i < DATA.length; i++) {
      if (DATA[i].id === id) return DATA[i];
    }
    return null;
  }

  /* --------------------------------------------------------------------
     部位大类
     首页的六个大卡片、计划页的「今天练什么」共用这一份定义。
     想改分类文案、图标、归属，只改这里，两个页面一起变。
       label     显示文字
       emoji     图标
       muscles   对应主要肌群，可以写多个
       category  按类别筛选（有氧用这个）
       tone      配色 0–7
     -------------------------------------------------------------------- */
  var GROUPS = [
    { key: 'chest',    label: '练胸',   noun: '胸部', emoji: '🏋️', muscles: ['胸'],   tone: 0 },
    { key: 'back',     label: '练背',   noun: '背部', emoji: '🧗', muscles: ['背'],   tone: 1 },
    { key: 'shoulder', label: '练肩',   noun: '肩部', emoji: '🤸', muscles: ['肩'],   tone: 2 },
    { key: 'leg',      label: '练腿',   noun: '腿部', emoji: '🦵', muscles: ['腿'],   tone: 3 },
    { key: 'core',     label: '练核心', noun: '核心', emoji: '🔥', muscles: ['核心'], tone: 4 }
  ];

  // 判断一个动作是否属于某个大类；传 null 表示全部
  function inGroup(item, g) {
    if (!g) return true;
    if (g.category) return item.category === g.category;
    return g.muscles.indexOf(item.primaryMuscle) > -1;
  }

  function countGroup(g) {
    var n = 0;
    DATA.forEach(function (item) { if (inGroup(item, g)) n++; });
    return n;
  }

  function groupByKey(key) {
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].key === key) return GROUPS[i];
    }
    return null;
  }

  return {
    data: DATA,
    groups: GROUPS,
    asArray: asArray,
    tokenize: tokenize,
    search: search,
    count: count,
    findById: findById,
    inGroup: inGroup,
    countGroup: countGroup,
    groupByKey: groupByKey
  };
})();
