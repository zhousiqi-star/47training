/* ==========================================================================
   视频数据生成器
   填表 → 实时预览封面 → 生成可直接粘贴进 videos.js 的代码
   ========================================================================== */

(function () {
  'use strict';

  var EXISTING = window.VIDEOS || [];

  /* 配色必须和 style.css 里的 .tone-0 ~ .tone-7 一致 */
  var TONES = [
    ['#ef4444', '#f97316'],
    ['#3b82f6', '#06b6d4'],
    ['#8b5cf6', '#6366f1'],
    ['#10b981', '#14b8a6'],
    ['#f59e0b', '#f97316'],
    ['#ec4899', '#f43f5e'],
    ['#6366f1', '#8b5cf6'],
    ['#0ea5e9', '#3b82f6']
  ];

  var EMOJIS = ['🏋️', '🥇', '🏃', '💥', '⚽', '🏊', '⛷️', '🥊',
                '🧗', '🤸', '🚴', '🏀', '🎾', '🥋', '🧘', '🎬'];

  var toneIndex = 0;
  var mode = 'new';        // 'new' 新增 | 'edit' 编辑已有
  var editingId = '';      // 正在编辑的条目 id

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value.trim() : ''; }

  /* --------------------------------------------------------------------
     生成代码
     -------------------------------------------------------------------- */
  // 安全地包成 JS 字符串：优先单引号，内容有单引号就换双引号，都有就转义
  function q(s) {
    s = String(s == null ? '' : s);
    if (s.indexOf("'") === -1) return "'" + s + "'";
    if (s.indexOf('"') === -1) return '"' + s + '"';
    return "'" + s.replace(/'/g, "\\'") + "'";
  }

  function splitTags(s) {
    return String(s || '')
      .split(/[,，、\s]+/)
      .map(function (t) { return t.trim(); })
      .filter(Boolean);
  }

  function randomId() {
    return 'video-' + Math.random().toString(36).slice(2, 8);
  }

  function buildObject() {
    return {
      id: val('f-id') || randomId(),
      athlete: val('f-athlete'),
      title: val('f-title'),
      sport: val('f-sport'),
      emoji: val('f-emoji') || '🎬',
      tone: toneIndex,
      duration: val('f-duration'),
      cover: val('f-cover'),
      url: val('f-url'),
      note: val('f-note'),
      tags: splitTags(val('f-tags'))
    };
  }

  function toCode(o) {
    var lines = [
      '  {',
      '    id: ' + q(o.id) + ',',
      '    athlete: ' + q(o.athlete) + ',',
      '    title: ' + q(o.title) + ',',
      '    sport: ' + q(o.sport) + ',',
      '    emoji: ' + q(o.emoji) + ',',
      '    tone: ' + o.tone + ',',
      '    duration: ' + q(o.duration) + ',',
      '    cover: ' + q(o.cover) + ',',
      '    url: ' + q(o.url) + ',',
      '    note: ' + q(o.note) + ',',
      '    tags: [' + o.tags.map(q).join(', ') + ']',
      '  },'
    ];
    return lines.join('\n');
  }

  /* --------------------------------------------------------------------
     封面图：拖拽 / 点击 / 粘贴 → 压缩成 data URL
     纯静态站没有后端，所以图片直接压成 base64 写进 cover 字段
     -------------------------------------------------------------------- */
  var COVER_W = 480;
  var COVER_H = 270;      // 16:9
  var MAX_CHARS = 120000; // base64 长度上限，约 88KB

  function setCoverNote(text, kind) {
    var n = el('cover-note');
    if (!n) return;
    n.textContent = text || '';
    n.className = 'field-note' + (kind ? ' ' + kind : '');
  }

  // 按 cover 方式居中裁剪，避免拉伸变形
  function compressImage(img) {
    var canvas = document.createElement('canvas');
    canvas.width = COVER_W;
    canvas.height = COVER_H;

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, COVER_W, COVER_H);

    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(COVER_W / iw, COVER_H / ih);
    var w = iw * scale;
    var h = ih * scale;

    ctx.drawImage(img, (COVER_W - w) / 2, (COVER_H - h) / 2, w, h);

    var quality = 0.82;
    var data = canvas.toDataURL('image/jpeg', quality);

    // 太大就逐级降质量
    while (data.length > MAX_CHARS && quality > 0.4) {
      quality -= 0.12;
      data = canvas.toDataURL('image/jpeg', quality);
    }

    var kb = Math.round(data.length * 0.75 / 1024);
    var tooBig = data.length > MAX_CHARS;

    setCoverNote(
      '已生成封面 · 原图 ' + iw + '×' + ih + ' → ' + COVER_W + '×' + COVER_H +
      ' · 约 ' + kb + 'KB' +
      (tooBig ? '（还是偏大，建议换小一点的图）' : ''),
      tooBig ? 'warn' : 'ok'
    );

    return data;
  }

  function handleCoverFile(file) {
    if (!file) return;

    if (!/^image\//.test(file.type || '')) {
      setCoverNote('只能拖入图片文件（jpg / png / webp）', 'warn');
      return;
    }

    setCoverNote('正在处理图片…', '');

    var reader = new FileReader();

    reader.onload = function () {
      var img = new Image();

      img.onload = function () {
        el('f-cover').value = compressImage(img);
        render();
      };

      img.onerror = function () {
        setCoverNote('这张图读不出来，换一张试试', 'warn');
      };

      img.src = reader.result;
    };

    reader.onerror = function () {
      setCoverNote('文件读取失败', 'warn');
    };

    reader.readAsDataURL(file);
  }

  function bindCoverDrop() {
    var zone = el('cover-drop');
    var fileInput = el('cover-file');

    // 点击 = 选文件
    zone.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleCoverFile(fileInput.files[0]);
      fileInput.value = '';
    });

    // 拖入高亮
    ['dragenter', 'dragover'].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('dragging');
      });
    });

    ['dragleave', 'drop'].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'dragleave' && e.relatedTarget && zone.contains(e.relatedTarget)) return;
        zone.classList.remove('dragging');
      });
    });

    zone.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) handleCoverFile(dt.files[0]);
    });

    // 防止拖到页面其他地方时浏览器直接打开图片
    ['dragover', 'drop'].forEach(function (type) {
      document.addEventListener(type, function (e) { e.preventDefault(); });
    });

    // 支持 Ctrl+V 粘贴图片
    document.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') === 0) {
          handleCoverFile(items[i].getAsFile());
          break;
        }
      }
    });

    // 清除
    el('cover-clear').addEventListener('click', function () {
      el('f-cover').value = '';
      setCoverNote('已清除，封面回到渐变色块', '');
      render();
    });
  }

  /* --------------------------------------------------------------------
     封面预览（复用视频页的样式）
     -------------------------------------------------------------------- */
  function renderPreview(o) {
    var wrap = el('preview-card');
    wrap.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'cover is-preview tone-' + o.tone;

    var media = document.createElement('span');
    media.className = 'cover-media' + (o.cover ? ' has-img' : '');
    if (o.cover) media.style.setProperty('--cover-img', 'url("' + o.cover + '")');

    var emoji = document.createElement('span');
    emoji.className = 'cover-emoji';
    emoji.textContent = o.emoji || '🎬';
    media.appendChild(emoji);

    if (o.duration) {
      var dur = document.createElement('span');
      dur.className = 'cover-dur';
      dur.textContent = o.duration;
      media.appendChild(dur);
    }

    var body = document.createElement('span');
    body.className = 'cover-body';

    var athlete = document.createElement('span');
    athlete.className = 'cover-athlete';
    athlete.textContent = o.athlete || '运动员名字';

    var title = document.createElement('span');
    title.className = 'cover-title';
    title.textContent = o.title || '视频标题';

    body.appendChild(athlete);
    body.appendChild(title);

    card.appendChild(media);
    card.appendChild(body);
    wrap.appendChild(card);
  }

  /* --------------------------------------------------------------------
     配色选择器
     -------------------------------------------------------------------- */
  function buildTones() {
    var wrap = el('tone-picks');

    TONES.forEach(function (pair, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tone-pick' + (i === toneIndex ? ' active' : '');
      b.title = '配色 ' + i;
      b.style.background = 'linear-gradient(140deg, ' + pair[0] + ', ' + pair[1] + ')';

      b.addEventListener('click', function () {
        toneIndex = i;
        var all = wrap.querySelectorAll('.tone-pick');
        for (var k = 0; k < all.length; k++) {
          all[k].classList.toggle('active', k === i);
        }
        render();
      });

      wrap.appendChild(b);
    });
  }

  /* --------------------------------------------------------------------
     emoji 快捷选择
     -------------------------------------------------------------------- */
  function buildEmojis() {
    var wrap = el('emoji-picks');
    var input = el('f-emoji');

    EMOJIS.forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'emoji-pick';
      b.textContent = e;
      b.addEventListener('click', function () {
        input.value = e;
        render();
      });
      wrap.appendChild(b);
    });
  }

  /* --------------------------------------------------------------------
     提示信息
     -------------------------------------------------------------------- */
  function updateNotes(o) {
    // 链接
    var urlNote = el('url-note');
    var url = o.url;

    if (!url) {
      urlNote.textContent = '留空的话，视频页只显示封面，不能播放';
      urlNote.className = 'field-note';
    } else if (/douyin\.com/.test(url) && /(?:modal_id=|\/video\/)\d{15,}/.test(url)) {
      urlNote.textContent = '✓ 识别为抖音视频，会用官方竖屏播放器（9:16）';
      urlNote.className = 'field-note ok';
    } else if (/douyin\.com/.test(url)) {
      urlNote.textContent = '⚠ 这是抖音短链（v.douyin.com），拿不到视频 ID。请在抖音里打开视频 → 复制链接，用带 modal_id= 的完整地址';
      urlNote.className = 'field-note warn';
    } else if (/bilibili\.com\/video\/BV[0-9A-Za-z]+/.test(url)) {
      urlNote.textContent = '✓ 识别为 B站视频，会自动嵌入播放器';
      urlNote.className = 'field-note ok';
    } else if (/(youtube\.com\/watch\?v=|youtu\.be\/)/.test(url)) {
      urlNote.textContent = '✓ 识别为 YouTube 视频（国内可能打不开）';
      urlNote.className = 'field-note ok';
    } else {
      urlNote.textContent = '⚠ 这个链接无法嵌入播放，视频页只会显示「在新窗口打开」按钮';
      urlNote.className = 'field-note warn';
    }

    // id 重复（编辑模式下自己那条不算冲突）
    var idNote = el('id-note');
    var dup = EXISTING.some(function (v) {
      return v.id === o.id && !(mode === 'edit' && v.id === editingId);
    });

    if (mode === 'edit') {
      idNote.textContent = '编辑已有条目时 id 不能改，改了会变成新增一条';
      idNote.className = 'field-note';
    } else if (dup) {
      idNote.textContent = '⚠ 这个 id 在 videos.js 里已经存在了，请点「换一个」';
      idNote.className = 'field-note warn';
    } else {
      idNote.textContent = '自动生成的，一般不用改';
      idNote.className = 'field-note';
    }

    // 缺必填
    var hint = el('editor-hint');
    if (mode === 'edit' && !editingId) {
      hint.textContent = '先在左上角选择要编辑的视频';
      hint.className = 'editor-hint warn';
    } else if (!o.athlete || !o.title) {
      hint.textContent = '还需要填：' + (!o.athlete ? '运动员 ' : '') + (!o.title ? '视频标题' : '');
      hint.className = 'editor-hint warn';
    } else if (dup) {
      hint.textContent = 'id 冲突，先点「换一个」再复制';
      hint.className = 'editor-hint warn';
    } else if (mode === 'edit') {
      hint.textContent = '改好了，复制后替换掉文件里原来那一段';
      hint.className = 'editor-hint';
    } else {
      hint.textContent = '填好了，点上面按钮复制';
      hint.className = 'editor-hint';
    }

    // 代码框上方的操作说明
    var codeHint = el('code-hint');
    if (mode === 'edit' && !editingId) {
      codeHint.textContent = '先在左边「选择要编辑的视频」，再复制代码';
      codeHint.className = 'code-hint warn';
    } else if (mode === 'edit') {
      codeHint.textContent =
        '在 videos.js 里找到 id: \'' + editingId + '\' 的那一段，整段替换成下面这段';
      codeHint.className = 'code-hint warn';
    } else {
      codeHint.textContent = '粘贴到 videos.js 的 ]; 前面';
      codeHint.className = 'code-hint';
    }
  }

  /* --------------------------------------------------------------------
     新增 / 编辑已有
     -------------------------------------------------------------------- */
  function syncToneButtons() {
    var all = el('tone-picks').querySelectorAll('.tone-pick');
    for (var i = 0; i < all.length; i++) {
      all[i].classList.toggle('active', i === toneIndex);
    }
  }

  function buildExistingList() {
    var sel = el('f-existing');
    sel.innerHTML = '';

    var first = document.createElement('option');
    first.value = '';
    first.textContent = '— 请选择 —';
    sel.appendChild(first);

    EXISTING.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = (v.athlete || '（无名）') + ' · ' + (v.title || '（无标题）');
      sel.appendChild(opt);
    });

    sel.addEventListener('change', function () {
      editingId = sel.value;
      if (editingId) loadExisting(editingId);
      render();
    });
  }

  function loadExisting(id) {
    var v = null;
    for (var i = 0; i < EXISTING.length; i++) {
      if (EXISTING[i].id === id) { v = EXISTING[i]; break; }
    }
    if (!v) return;

    el('f-id').value = v.id || '';
    el('f-athlete').value = v.athlete || '';
    el('f-title').value = v.title || '';
    el('f-sport').value = v.sport || '';
    el('f-duration').value = v.duration || '';
    el('f-cover').value = v.cover || '';
    el('f-emoji').value = v.emoji || '';
    el('f-note').value = v.note || '';
    el('f-tags').value = (v.tags || []).join(', ');
    el('f-url').value = v.url || '';

    toneIndex = typeof v.tone === 'number' ? v.tone : 0;
    syncToneButtons();

    setCoverNote(
      v.cover
        ? (v.cover.indexOf('data:') === 0
            ? '这条已有封面（拖入新图可以替换）'
            : '这条的封面是文件路径：' + v.cover)
        : '这条还没有封面，拖张图进来吧',
      ''
    );

    render();
  }

  function setMode(next) {
    mode = next;

    var tabs = el('mode-tabs').querySelectorAll('.mode-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.mode === mode);
    }

    el('existing-wrap').hidden = (mode !== 'edit');

    var idInput = el('f-id');
    var regen = el('regen-id');

    if (mode === 'new') {
      editingId = '';
      el('f-existing').value = '';
      // 清空表单
      ['f-athlete', 'f-title', 'f-sport', 'f-duration', 'f-url',
       'f-cover', 'f-emoji', 'f-note', 'f-tags'].forEach(function (id) {
        el(id).value = '';
      });
      idInput.value = randomId();
      toneIndex = 0;
      syncToneButtons();
      setCoverNote('', '');
    } else {
      editingId = '';
      el('f-existing').value = '';
      idInput.value = '';
      setCoverNote('先在上面选一个视频', '');
    }

    idInput.readOnly = (mode === 'edit');
    regen.disabled = (mode === 'edit');
    regen.style.opacity = (mode === 'edit') ? '.45' : '';

    render();
  }

  /* --------------------------------------------------------------------
     主渲染
     -------------------------------------------------------------------- */
  var lastCode = '';

  function render() {
    var o = buildObject();

    renderPreview(o);

    // 封面拖拽区的提示文案跟着状态变
    var hint = el('cover-drop-hint');
    if (hint) {
      hint.textContent = o.cover
        ? '已设置封面 · 拖入新图片可替换，或点击重新选择'
        : '拖图片到这里，或点击选择文件';
    }

    lastCode = toCode(o);
    el('code-box').textContent = lastCode;

    updateNotes(o);
  }

  /* --------------------------------------------------------------------
     复制
     -------------------------------------------------------------------- */
  function copyText(text) {
    // 优先用现代剪贴板 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    // 本地双击打开时可能不可用，退回旧办法
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  var copyBtn = el('copy-btn');

  copyBtn.addEventListener('click', function () {
    var original = '复制代码';

    copyText(lastCode).then(function () {
      copyBtn.textContent = '已复制 ✓';
      copyBtn.classList.add('done');
    }).catch(function () {
      copyBtn.textContent = '复制失败，请手动选中';
      copyBtn.classList.add('fail');
    }).then(function () {
      setTimeout(function () {
        copyBtn.textContent = original;
        copyBtn.classList.remove('done', 'fail');
      }, 1600);
    });
  });

  /* --------------------------------------------------------------------
     绑定
     -------------------------------------------------------------------- */
  ['f-athlete', 'f-title', 'f-sport', 'f-duration', 'f-url',
   'f-cover', 'f-emoji', 'f-note', 'f-tags', 'f-id'].forEach(function (id) {
    var e = el(id);
    if (e) e.addEventListener('input', render);
  });

  el('regen-id').addEventListener('click', function () {
    if (mode === 'edit') return;
    el('f-id').value = randomId();
    render();
  });

  el('mode-tabs').addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.mode-tab') : null;
    if (!btn || btn.dataset.mode === mode) return;
    setMode(btn.dataset.mode);
  });

  /* --------------------------------------------------------------------
     启动
     -------------------------------------------------------------------- */
  el('f-id').value = randomId();
  buildTones();
  buildEmojis();
  buildExistingList();
  bindCoverDrop();
  render();
})();
