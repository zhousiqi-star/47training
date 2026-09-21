/* ==========================================================================
   今天这张记录 —— 读数快照
   --------------------------------------------------------------------------
   它是这台机器的读数板被"拍"下来的一张图，**不是一张纸**：
   没有白底、没有格线、没有撕边、没有票据感（那是上一版被否掉的纸条风）。

   规格：1080 × 1620（2:3 竖版，朋友圈 / 小红书通用）
     · 顶栏     947 徽章 + fitness 字标 + 日期（脱离网站也能看懂）
     · 一条细线 把顶栏和工作面分开（是分隔，不是格线）
     · 读数板   一整块实心青：完成组数 / 凹槽进度 / 「今天做满了」
     · 清单     动作 + 完成组数 —— **不写重量**；右列两栏对齐，行行对称
     · 页脚     封存印 + 一行合计
   排布纪律：读数板和清单各自按内容占位，剩下的空间留成台面（**不许为了填满把中间挤死**）；
   全卡只有一支电光青，青的面积就是那块读数板。
   ========================================================================== */

window.FITCARD = (function () {
  'use strict';

  var W = 1080, H = 1620, PAD = 84, GAP = 56;

  // 卡上的颜色全部取自 :root 的同一套 token（canvas 读不到 CSS 变量，所以写死在这里）
  var C = {
    ground:      '#0B0F11',
    panelTop:    '#1E272B',
    panelBot:    '#151C1F',
    edge:        '#212A2E',
    edgeTop:     '#36434A',
    hairline:    'rgba(255,255,255,.06)',
    accent:      '#35E8C9',
    onAccent:    '#04211C',
    onAccent2:   'rgba(4,33,28,.72)',
    onAccent3:   'rgba(4,33,28,.52)',
    onAccentTrk: 'rgba(4,33,28,.24)',
    ink:         '#EAF6F7',
    ink2:        '#A9BDBF',
    ink3:        '#8B9FA2',
    inkDim:      '#7B9093',
    accentSoft:  'rgba(53,232,201,.14)'
  };

  var SANS = '"Segoe UI Variable Display","Segoe UI Variable Text","Segoe UI",system-ui,' +
             '"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei UI",sans-serif';
  var MONO = '"Cascadia Mono","SF Mono",ui-monospace,Consolas,monospace';

  function font(weight, size, mono) { return weight + ' ' + size + 'px ' + (mono ? MONO : SANS); }

  // 字距：支持的引擎上给标签一点呼吸，不支持就跳过（不报错）
  function tracking(ctx, px) {
    try { if ('letterSpacing' in ctx) ctx.letterSpacing = px; } catch (e) { /* 忽略 */ }
  }

  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 一块实体面：斜面 + 上沿倒角 + 常规边（少了倒角就变成一张贴纸）
  function panel(ctx, x, y, w, h, r) {
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, C.panelTop);
    g.addColorStop(1, C.panelBot);
    rrect(ctx, x, y, w, h, r);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    rrect(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = C.edgeTop;
    ctx.fillRect(x, y, w, 2);
    ctx.restore();

    rrect(ctx, x + 1, y + 1, w - 2, h - 2, r - 1);
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  /* --------------------------------------------------------------------
     顶栏
     -------------------------------------------------------------------- */
  var HEAD_Y = PAD, HEAD_H = 112, HAIRLINE_Y = HEAD_Y + HEAD_H;

  function drawHeader(ctx, d) {
    var y = HEAD_Y, h = HEAD_H;

    var bw = 138, bx = PAD;
    rrect(ctx, bx, y, bw, h, 30);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.save();
    rrect(ctx, bx, y, bw, h, 30);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(bx, y, bw, 3);
    ctx.restore();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.onAccent;
    ctx.font = font(700, 62, true);
    ctx.fillText('947', bx + bw / 2, y + h / 2 + 3);

    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    ctx.font = font(600, 52);
    ctx.fillText('fitness', bx + bw + 28, y + h / 2 + 3);

    ctx.textAlign = 'right';
    ctx.fillStyle = C.ink2;
    ctx.font = font(400, 42, true);
    ctx.fillText(d.date, W - PAD, y + h / 2 - 20);
    ctx.fillStyle = C.inkDim;
    ctx.font = font(600, 30);
    ctx.fillText(d.week, W - PAD, y + h / 2 + 30);

    // 分隔线：顶栏与工作面之间的一道细线（分隔，不是格线）
    ctx.fillStyle = C.hairline;
    ctx.fillRect(PAD, HAIRLINE_Y, W - PAD * 2, 2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /* --------------------------------------------------------------------
     读数板：一整块实心青
     -------------------------------------------------------------------- */
  function drawPlate(ctx, x, y, w, h, d) {
    rrect(ctx, x, y, w, h, 72);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.save();
    rrect(ctx, x, y, w, h, 72);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.42)';
    ctx.fillRect(x, y, w, 3);
    ctx.restore();

    var pad = 64;
    var labelBaseline = y + pad + 38;

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.onAccent3;
    ctx.font = font(600, 32);
    tracking(ctx, '6px');
    ctx.fillText('完成组数', x + pad, labelBaseline);
    tracking(ctx, '0px');

    ctx.textAlign = 'right';
    ctx.fillStyle = C.onAccent;
    ctx.font = font(600, 42);
    var left = d.totalSets - d.doneSets;
    ctx.fillText(left > 0 ? '还差 ' + left + ' 组' : '今天做满了', x + w - pad, labelBaseline);

    var trackH = 18;
    var trackY = y + h - pad - trackH;

    // 数字在"标签之下的空档"和"轨道之上的空档"之间居中——不贴顶，也不吊在中间
    var numSize = Math.max(180, Math.min(320, Math.round(h * 0.48)));
    var capH = numSize * 0.72;
    var top = labelBaseline + 26;
    var bottom = trackY - 26;
    var numTop = top + Math.max(0, (bottom - top - capH) / 2);
    var numBaseline = numTop + capH * 0.98;

    var numText = String(d.doneSets);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.onAccent;
    ctx.font = font(700, numSize, true);
    ctx.fillText(numText, x + pad, numBaseline);
    var numW = ctx.measureText(numText).width;

    ctx.fillStyle = C.onAccent2;
    ctx.font = font(600, Math.round(numSize * 0.30));
    ctx.fillText('组', x + pad + numW + 24, numBaseline);

    var trackW = w - pad * 2;
    rrect(ctx, x + pad, trackY, trackW, trackH, trackH / 2);
    ctx.fillStyle = C.onAccentTrk;
    ctx.fill();
    var ratio = d.totalSets > 0 ? Math.min(1, d.doneSets / d.totalSets) : 0;
    if (ratio > 0) {
      rrect(ctx, x + pad, trackY, Math.max(trackH, trackW * ratio), trackH, trackH / 2);
      ctx.fillStyle = C.onAccent;
      ctx.fill();
    }
  }

  /* --------------------------------------------------------------------
     清单：动作 + 完成组数（图里不写重量）
     右列两栏各自右对齐，所以每一行的数字都落在同一条竖线上。
     -------------------------------------------------------------------- */
  function drawList(ctx, x, y, w, items, listH) {
    var two = items.length > 6;
    var cols = two ? 2 : 1;
    var perCol = Math.max(1, Math.ceil(items.length / cols));
    var padY = 32;
    var rowH = Math.floor((listH - padY * 2) / perCol);
    var h = padY * 2 + rowH * perCol;

    panel(ctx, x, y, w, h, 48);

    var padX = 64;
    var gap = two ? 48 : 0;
    var colW = (w - padX * 2 - gap * (cols - 1)) / cols;

    var nameSize = Math.round(Math.min(46, Math.max(28, rowH * 0.44)));
    var numSize = Math.round(Math.min(42, Math.max(26, rowH * 0.38)));

    // 两栏宽度一次算出来，行与行之间才对得齐
    ctx.font = font(600, numSize, true);
    var setsW = 0, doneW = 0;
    items.forEach(function (it) {
      setsW = Math.max(setsW, ctx.measureText('/ ' + it.sets).width);
      doneW = Math.max(doneW, ctx.measureText(String(it.done)).width);
    });

    items.forEach(function (it, i) {
      var c = Math.floor(i / perCol);
      var r = i % perCol;
      var rx = x + padX + c * (colW + gap);
      var ry = y + padY + r * rowH;
      var base = ry + rowH * 0.66;

      if (r > 0) {
        ctx.fillStyle = C.edge;
        ctx.fillRect(rx, ry, colW, 2);
      }

      var setsRight = rx + colW;
      var doneRight = setsRight - setsW - 18;

      ctx.textAlign = 'right';
      ctx.font = font(600, numSize, true);
      ctx.fillStyle = C.inkDim;
      ctx.fillText('/ ' + it.sets, setsRight, base);
      ctx.fillStyle = C.ink;
      ctx.fillText(String(it.done), doneRight, base);

      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      ctx.font = font(600, nameSize);
      ctx.fillText(fitText(ctx, it.name, doneRight - doneW - rx - 40), rx, base);
    });

    return h;
  }

  /* --------------------------------------------------------------------
     页脚：封存印 + 一行合计
     -------------------------------------------------------------------- */
  var FOOT_H = 56, FOOT_TOP = H - PAD - FOOT_H;

  function drawFooter(ctx, d) {
    var y = FOOT_TOP;

    var label = '已封存 ' + d.sealTime;
    ctx.font = font(600, 34);
    var tw = ctx.measureText(label).width;

    rrect(ctx, PAD, y, tw + 56, FOOT_H, FOOT_H / 2);
    ctx.fillStyle = C.accentSoft;
    ctx.fill();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.accent;
    ctx.fillText(label, PAD + 28, y + FOOT_H / 2 + 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = C.inkDim;
    ctx.font = font(400, 34, true);
    ctx.fillText(d.summary, W - PAD, y + FOOT_H / 2 + 2);
    ctx.textBaseline = 'alphabetic';
  }

  /* 固定种子的伪随机：同样的数据永远画出同一张卡（可复现，才谈得上"精致"） */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* 极细噪点：和网站的 body::after 同一件事（哑光面的颗粒感） */
  function grain(ctx) {
    var rnd = mulberry32(20260921);
    var t = document.createElement('canvas');
    t.width = t.height = 160;
    var tc = t.getContext('2d');
    var id = tc.createImageData(160, 160);
    for (var i = 0; i < id.data.length; i += 4) {
      var v = rnd() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = rnd() < 0.5 ? 0 : 12;
    }
    tc.putImageData(id, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = ctx.createPattern(t, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* --------------------------------------------------------------------
     一张卡
     -------------------------------------------------------------------- */
  function draw(ctx, d) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, 0, W, H);

    // 顶部顶灯：和网站的环境光同一支青，极淡
    var glow = ctx.createRadialGradient(W / 2, -300, 60, W / 2, -300, 1400);
    glow.addColorStop(0, 'rgba(53,232,201,.06)');
    glow.addColorStop(1, 'rgba(53,232,201,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    drawHeader(ctx, d);

    var items = d.items || [];
    var plateY = HAIRLINE_Y + 80;
    var avail = FOOT_TOP - 56 - plateY;

    // 读数板按内容占位；清单在旁边按内容占位；两者之间的剩余留成台面
    var perCol = Math.max(1, Math.ceil(items.length / (items.length > 6 ? 2 : 1)));
    var maxPlate = items.length <= 2 ? 840 : 700;
    var plateH = Math.max(420, Math.min(maxPlate, Math.round(avail * 0.56)));
    var listH = items.length ? avail - plateH - GAP : 0;
    var rowH = items.length ? Math.max(64, Math.min(120, Math.floor((listH - 64) / perCol))) : 0;
    listH = items.length ? 64 + rowH * perCol : 0;

    var leftover = avail - plateH - (items.length ? GAP + listH : 0);
    if (items.length && leftover > 0) plateH = Math.min(maxPlate, plateH + leftover);
    else if (items.length && leftover < 0) plateH = Math.max(380, plateH + leftover);

    drawPlate(ctx, PAD, plateY, W - PAD * 2, plateH, d);
    if (items.length) drawList(ctx, PAD, plateY + plateH + GAP, W - PAD * 2, items, listH);
    drawFooter(ctx, d);
    grain(ctx);
  }

  /* --------------------------------------------------------------------
     文字版（复制到微信 / 备忘录用）
     文字版仍然带重量：图片是发出去的，文字是给自己和教练看的
     -------------------------------------------------------------------- */
  function toText(d) {
    var out = ['947fitness · ' + d.date + ' ' + d.week];
    var head = d.actions + ' 个动作 · ' + d.doneSets + ' 组';
    if (d.maxWeight) head += ' · 最重 ' + d.maxWeight.value + 'kg（' + d.maxWeight.name + '）';
    out.push(head);
    out.push('');
    (d.items || []).forEach(function (it) {
      out.push(it.name + ' ' + it.done + '/' + it.sets + (it.weight ? ' · ' + it.weight + 'kg' : ''));
    });
    out.push('');
    out.push('已封存 ' + d.sealTime);
    return out.join('\n');
  }

  /* --------------------------------------------------------------------
     浮层
     -------------------------------------------------------------------- */
  var canvas = document.getElementById('card-canvas');
  var overlay = document.getElementById('card-overlay');
  var elClose = document.getElementById('card-close');
  var elSave = document.getElementById('card-save');
  var elCopy = document.getElementById('card-copy');
  var elHint = document.getElementById('card-hint');
  var elManual = null;                       // 复制失败时临时建的那块输入面
  var last = null;

  function fileName(d) { return '947fitness-' + d.date + '.png'; }

  function open(d) {
    if (!canvas || !overlay) return;
    last = d;
    canvas.width = W;
    canvas.height = H;
    draw(canvas.getContext('2d'), d);
    overlay.hidden = false;
    if (elHint) elHint.textContent = '手机上长按这张图保存到相册，或点下面的按钮。';
    if (elCopy) elCopy.textContent = '复制文字';
    if (elManual) elManual.hidden = true;
    if (elClose) elClose.focus();
  }

  function close() {
    if (overlay) overlay.hidden = true;
  }

  function save() {
    if (!canvas || !last) return;
    var url;
    try { url = canvas.toDataURL('image/png'); } catch (e) { url = ''; }
    if (!url) return;
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName(last);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (elHint) elHint.textContent = '已保存：' + fileName(last) + '（手机相册里找不到就长按上面的图保存）';
  }

  function copy() {
    if (!last) return;
    var text = toText(last);
    function done(ok) {
      if (ok) {
        if (elCopy) {
          elCopy.textContent = '已复制';
          setTimeout(function () { elCopy.textContent = '复制文字'; }, 1800);
        }
        if (elManual) elManual.hidden = true;
        if (elHint) elHint.textContent = '已复制到剪贴板，粘到微信 / 备忘录里就行。';
      } else {
        showManual(text);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback(text)); });
    } else {
      done(fallback(text));
    }
  }

  // file:// 或旧引擎没有 clipboard API，退回老办法（textarea + execCommand）
  function fallback(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* 两条复制路径都失败时，不能把用户留在死胡同里：
     就地放一块输入面，把文本选中，让他自己按 Ctrl/⌘ + C。 */
  function showManual(text) {
    if (!elManual) {
      elManual = document.createElement('textarea');
      elManual.className = 'card-manual';
      elManual.setAttribute('readonly', 'readonly');
      elManual.setAttribute('aria-label', '复制失败，手动复制的文本');
      elManual.hidden = true;
      if (elHint && elHint.parentNode) elHint.parentNode.insertBefore(elManual, elHint.nextSibling);
      else if (overlay) overlay.querySelector('.card-panel').appendChild(elManual);
    }
    elManual.value = text;
    elManual.hidden = false;
    elManual.focus();
    elManual.select();
    if (elHint) elHint.textContent = '这个浏览器不让自动复制。文本已经选中，按 Ctrl / ⌘ + C 就行。';
  }

  if (elClose) elClose.addEventListener('click', close);
  if (elSave) elSave.addEventListener('click', save);
  if (elCopy) elCopy.addEventListener('click', copy);
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && !overlay.hidden) close();
  });

  return { W: W, H: H, open: open, close: close, draw: draw, toText: toText };
})();
