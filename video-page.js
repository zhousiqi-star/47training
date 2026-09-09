/* ==========================================================================
   训练视频页逻辑 —— 一般不需要改动
   顶部横向封面条：点选后下方预览
   ========================================================================== */

(function () {
  'use strict';

  var VIDEOS = window.VIDEOS || [];

  var elStrip = document.getElementById('strip');
  var elStage = document.getElementById('stage');
  var elPrev  = document.getElementById('prev');
  var elNext  = document.getElementById('next');

  var current = 0;

  /* --------------------------------------------------------------------
     把普通视频链接转成播放器地址
     支持：抖音（官方竖屏播放器）、B站、YouTube
     其他站点返回 null，页面会退化成"新窗口打开"按钮
     -------------------------------------------------------------------- */
  function toEmbed(url) {
    if (!url) return null;

    var m;

    // 抖音：官方 iframe 播放器，竖屏。
    // 视频 ID 可能出现在 modal_id=、/video/<id>、/share/video/<id> 里
    m = /(?:modal_id=|\/video\/)(\d{15,})/.exec(url);
    if (/douyin\.com/.test(url) && m) {
      return {
        src: 'https://open.douyin.com/player/video?vid=' + m[1] + '&autoplay=0',
        vertical: true,
        referrer: 'unsafe-url'      // 抖音官方嵌入代码要求
      };
    }

    // B站
    m = /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/.exec(url);
    if (m) {
      return {
        src: 'https://player.bilibili.com/player.html?bvid=' + m[1] +
             '&autoplay=0&high_quality=1&danmaku=0',
        vertical: false,
        referrer: 'no-referrer'
      };
    }

    // YouTube
    m = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
    if (m) {
      return {
        src: 'https://www.youtube.com/embed/' + m[1],
        vertical: false,
        referrer: 'no-referrer'
      };
    }

    return null;
  }

  // ---------- 封面条 ----------
  function buildStrip() {
    elStrip.innerHTML = '';

    VIDEOS.forEach(function (v, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cover tone-' + (v.tone || 0);
      btn.dataset.index = idx;
      if (v.cover) btn.style.setProperty('--cover-img', 'url("' + v.cover + '")');

      var media = document.createElement('span');
      media.className = 'cover-media' + (v.cover ? ' has-img' : '');

      var emoji = document.createElement('span');
      emoji.className = 'cover-emoji';
      emoji.textContent = v.emoji || '🎬';
      media.appendChild(emoji);

      if (v.duration) {
        var dur = document.createElement('span');
        dur.className = 'cover-dur';
        dur.textContent = v.duration;
        media.appendChild(dur);
      }

      var body = document.createElement('span');
      body.className = 'cover-body';

      var athlete = document.createElement('span');
      athlete.className = 'cover-athlete';
      athlete.textContent = v.athlete;

      var title = document.createElement('span');
      title.className = 'cover-title';
      title.textContent = v.title;

      body.appendChild(athlete);
      body.appendChild(title);

      btn.appendChild(media);
      btn.appendChild(body);

      btn.addEventListener('click', function () { select(idx); });

      elStrip.appendChild(btn);
    });
  }

  // ---------- 预览区 ----------
  function renderStage() {
    var v = VIDEOS[current];
    if (!v) return;

    elStage.innerHTML = '';

    var inner = document.createElement('div');
    inner.className = 'stage-inner';

    // 左侧：播放器或封面
    var media = document.createElement('div');
    media.className = 'stage-media tone-' + (v.tone || 0);

    var embed = toEmbed(v.url);

    if (embed) {
      if (embed.vertical) {
        inner.classList.add('vertical');
        media.classList.add('vertical');
      }

      var iframe = document.createElement('iframe');
      iframe.className = 'stage-iframe';
      iframe.src = embed.src;
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('referrerpolicy', embed.referrer || 'no-referrer');
      media.appendChild(iframe);
    } else {
      var cover = document.createElement('div');
      cover.className = 'stage-cover' + (v.cover ? ' has-img' : '');
      if (v.cover) cover.style.setProperty('--cover-img', 'url("' + v.cover + '")');

      var bigEmoji = document.createElement('span');
      bigEmoji.className = 'stage-emoji';
      bigEmoji.textContent = v.emoji || '🎬';

      var hint = document.createElement('span');
      hint.className = 'stage-hint';
      hint.textContent = '把视频链接填进 videos.js 的 url 字段，就能在这里播放';

      cover.appendChild(bigEmoji);
      cover.appendChild(hint);
      media.appendChild(cover);
    }

    // 右侧：信息
    var info = document.createElement('div');
    info.className = 'stage-info';

    var sport = document.createElement('span');
    sport.className = 'stage-sport';
    sport.textContent = v.sport || '';

    var title = document.createElement('h2');
    title.textContent = v.title;

    var athlete = document.createElement('p');
    athlete.className = 'stage-athlete';
    athlete.textContent = v.athlete;

    var note = document.createElement('p');
    note.className = 'stage-note';
    note.textContent = v.note || '';

    info.appendChild(sport);
    info.appendChild(title);
    info.appendChild(athlete);
    info.appendChild(note);

    if (v.tags && v.tags.length) {
      var tags = document.createElement('div');
      tags.className = 'stage-tags';
      v.tags.forEach(function (t, i) {
        var span = document.createElement('span');
        span.className = 'tag' + (i === 0 ? ' primary' : '');
        span.textContent = t;
        tags.appendChild(span);
      });
      info.appendChild(tags);
    }

    if (v.url) {
      var link = document.createElement('a');
      link.className = 'video-link';
      link.href = v.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = '在新窗口打开 →';
      info.appendChild(link);
    }

    inner.appendChild(media);
    inner.appendChild(info);
    elStage.appendChild(inner);
  }

  // ---------- 选中 ----------
  function select(idx, scroll) {
    if (idx < 0) idx = VIDEOS.length - 1;
    if (idx >= VIDEOS.length) idx = 0;

    current = idx;

    var cards = elStrip.querySelectorAll('.cover');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('active', i === current);
    }

    if (scroll !== false && cards[current]) {
      var card = cards[current];
      var left = card.offsetLeft - (elStrip.clientWidth - card.clientWidth) / 2;
      elStrip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }

    renderStage();
  }

  // ---------- 左右按钮 ----------
  function step(dir) {
    var card = elStrip.querySelector('.cover');
    var w = card ? card.getBoundingClientRect().width + 16 : 300;
    elStrip.scrollBy({ left: dir * w, behavior: 'smooth' });
  }

  elPrev.addEventListener('click', function () { step(-1); });
  elNext.addEventListener('click', function () { step(1); });

  // 方向键切换选中
  elStrip.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); select(current + 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); select(current - 1); }
  });

  // 鼠标滚轮横向滚动封面条
  elStrip.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      elStrip.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  // ---------- 启动 ----------
  buildStrip();
  select(0, false);
})();
