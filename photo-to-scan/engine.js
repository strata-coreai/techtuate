/* techtuate photo-to-scan engine. Pure JS, no dependencies, runs 100% in the browser.
   Images are plain objects: { width, height, data: Uint8ClampedArray RGBA }. */
(function (root) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function makeImage(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

  /* ---------- small helpers ---------- */

  function downChannel(img, k, nw, nh) {
    const { width: w, height: h, data: d } = img;
    const sum = new Float32Array(nw * nh), cnt = new Float32Array(nw * nh);
    for (let y = 0; y < h; y++) {
      const oy = Math.min(nh - 1, (y * nh / h) | 0) * nw;
      for (let x = 0; x < w; x++) {
        const o = oy + Math.min(nw - 1, (x * nw / w) | 0);
        sum[o] += d[(y * w + x) * 4 + k]; cnt[o]++;
      }
    }
    for (let i = 0; i < sum.length; i++) sum[i] = cnt[i] ? sum[i] / cnt[i] : 0;
    return sum;
  }

  // square max (isMax) or min filter, separable
  function rankFilter(src, w, h, r, isMax) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    const pick = isMax ? Math.max : Math.min;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = src[y * w + x];
      for (let k = -r; k <= r; k++) v = pick(v, src[y * w + clamp(x + k, 0, w - 1)]);
      tmp[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = tmp[y * w + x];
      for (let k = -r; k <= r; k++) v = pick(v, tmp[clamp(y + k, 0, h - 1) * w + x]);
      out[y * w + x] = v;
    }
    return out;
  }

  // separable running-sum box blur on a single float channel
  function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[row + clamp(k, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / n;
        acc += src[row + clamp(x + r + 1, 0, w - 1)] - src[row + clamp(x - r, 0, w - 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += tmp[clamp(k, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / n;
        acc += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
      }
    }
    return out;
  }

  function percentileOf(arr, p) {
    let max = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
    if (!max) return 0;
    const bins = 1024, hist = new Uint32Array(bins);
    for (let i = 0; i < arr.length; i++) hist[Math.min(bins - 1, (arr[i] / max * (bins - 1)) | 0)]++;
    let target = arr.length * p, run = 0;
    for (let b = 0; b < bins; b++) { run += hist[b]; if (run >= target) return b / (bins - 1) * max; }
    return max;
  }

  /* ---------- corner detection (edges + Hough lines + best quadrilateral) ---------- */

  function detectCorners(img) {
    const W = img.width, H = img.height;
    const s = Math.min(1, 400 / Math.max(W, H));
    const w = Math.max(16, Math.round(W * s)), h = Math.max(16, Math.round(H * s));
    const mag = new Float32Array(w * h), ang = new Float32Array(w * h);
    // per channel: morphological closing wipes out thin dark text, keeping page outlines
    for (let k = 0; k < 3; k++) {
      let c = downChannel(img, k, w, h);
      c = rankFilter(rankFilter(c, w, h, 2, true), w, h, 2, false);
      c = boxBlur(c, w, h, 1);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const gx = (c[i - w + 1] + 2 * c[i + 1] + c[i + w + 1]) - (c[i - w - 1] + 2 * c[i - 1] + c[i + w - 1]);
          const gy = (c[i + w - 1] + 2 * c[i + w] + c[i + w + 1]) - (c[i - w - 1] + 2 * c[i - w] + c[i - w + 1]);
          const m = Math.hypot(gx, gy);
          if (m > mag[i]) { mag[i] = m; ang[i] = Math.atan2(gy, gx); }
        }
      }
    }
    const thr = Math.max(12, percentileOf(mag, 0.9));
    const edge = new Uint8Array(w * h);
    for (let i = 0; i < edge.length; i++) edge[i] = mag[i] > thr ? 1 : 0;


    const nT = 180, diag = Math.ceil(Math.hypot(w, h)), nR = 2 * diag + 1;
    const cosT = new Float32Array(nT), sinT = new Float32Array(nT);
    for (let t = 0; t < nT; t++) { cosT[t] = Math.cos(t * Math.PI / nT); sinT[t] = Math.sin(t * Math.PI / nT); }
    const acc = new Float32Array(nT * nR);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!edge[i]) continue;
        let t0 = Math.round((ang[i] < 0 ? ang[i] + Math.PI : ang[i]) * nT / Math.PI);
        for (let dt = -10; dt <= 10; dt++) {
          const t = ((t0 + dt) % nT + nT) % nT;
          const r = Math.round(x * cosT[t] + y * sinT[t]) + diag;
          acc[t * nR + r] += 1;
        }
      }
    }

    // peak picking with non-maximum suppression
    const minVotes = Math.min(w, h) * 0.12;
    const cells = [];
    for (let i = 0; i < acc.length; i++) if (acc[i] >= minVotes) cells.push(i);
    cells.sort((a, b) => acc[b] - acc[a]);
    const lines = [];
    for (const c of cells) {
      const t = (c / nR) | 0, r = (c % nR) - diag;
      let dup = false;
      for (const L of lines) {
        const dT = Math.abs(L.t - t);
        if ((dT < 6 && Math.abs(L.r - r) < 12) || (dT > nT - 6 && Math.abs(L.r + r) < 12)) { dup = true; break; }
      }
      if (!dup) lines.push({ t, r, theta: t * Math.PI / nT, votes: acc[c] });
      if (lines.length >= 30 || cells.length > 200000 && lines.length >= 20) break;
    }

    const horiz = [], vert = [];
    for (const L of lines) (Math.abs(Math.sin(L.theta)) > 0.707 ? horiz : vert).push(L);
    // image borders as weak fallbacks (document running off the photo)
    horiz.push({ theta: Math.PI / 2, r: 0, border: true }, { theta: Math.PI / 2, r: h - 1, border: true });
    vert.push({ theta: 0, r: 0, border: true }, { theta: 0, r: w - 1, border: true });

    const yAt = (L, x) => (L.r - x * Math.cos(L.theta)) / Math.sin(L.theta);
    const xAt = (L, y) => (L.r - y * Math.sin(L.theta)) / Math.cos(L.theta);
    function inter(a, b) {
      const c1 = Math.cos(a.theta), s1 = Math.sin(a.theta), c2 = Math.cos(b.theta), s2 = Math.sin(b.theta);
      const det = c1 * s2 - s1 * c2;
      if (Math.abs(det) < 1e-6) return null;
      return [(a.r * s2 - s1 * b.r) / det, (c1 * b.r - a.r * c2) / det];
    }
    // share of points along a side that sit on an edge running the same way as the side
    function support(p, q) {
      const n = 48, len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const nx = -(q[1] - p[1]) / len, ny = (q[0] - p[0]) / len;
      let hit = 0, tot = 0;
      for (let k = 1; k < n; k++) {
        const x = Math.round(p[0] + (q[0] - p[0]) * k / n), y = Math.round(p[1] + (q[1] - p[1]) * k / n);
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
        tot++;
        let ok = false;
        for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2; dx++) {
          const i = (y + dy) * w + x + dx;
          if (edge[i] && Math.abs(Math.cos(ang[i]) * nx + Math.sin(ang[i]) * ny) > 0.9) { ok = true; break; }
        }
        if (ok) hit++;
      }
      return tot > n * 0.5 ? hit / (n - 1) : 0;
    }
    function convex(q) {
      let sign = 0;
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
        const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
        if (Math.abs(cr) < 1e-6) return false;
        const sg = Math.sign(cr);
        if (sign && sg !== sign) return false;
        sign = sg;
      }
      return true;
    }
    function area(q) {
      let a = 0;
      for (let i = 0; i < 4; i++) { const p = q[i], n = q[(i + 1) % 4]; a += p[0] * n[1] - n[0] * p[1]; }
      return Math.abs(a) / 2;
    }

    function angleGap(a, b) {
      let d = Math.abs(a - b) * 180 / Math.PI;
      return d > 90 ? 180 - d : d;
    }
    let best = null, bestScore = -1;
    const mx = w * 0.08, my = h * 0.08;
    for (let a = 0; a < horiz.length; a++) for (let b = a + 1; b < horiz.length; b++) {
      let top = horiz[a], bot = horiz[b];
      if (yAt(top, w / 2) > yAt(bot, w / 2)) { const t = top; top = bot; bot = t; }
      if (yAt(bot, w / 2) - yAt(top, w / 2) < h * 0.2) continue;
      for (let c = 0; c < vert.length; c++) for (let d = c + 1; d < vert.length; d++) {
        let left = vert[c], right = vert[d];
        if (xAt(left, h / 2) > xAt(right, h / 2)) { const t = left; left = right; right = t; }
        if (xAt(right, h / 2) - xAt(left, h / 2) < w * 0.2) continue;
        const q = [inter(top, left), inter(top, right), inter(bot, right), inter(bot, left)];
        if (q.some(p => !p || p[0] < -mx || p[1] < -my || p[0] > w - 1 + mx || p[1] > h - 1 + my)) continue;
        if (!convex(q)) continue;
        const af = area(q) / (w * h);
        if (af < 0.12) continue;
        const sides = [[top, q[0], q[1]], [right, q[1], q[2]], [bot, q[2], q[3]], [left, q[3], q[0]]];
        let sum = 0, borders = 0;
        for (const [L, p, r] of sides) {
          if (L.border) { borders++; sum += 0.3; } else sum += support(p, r);
        }
        // real pages keep opposite sides close to parallel, even in perspective
        const skew = angleGap(top.theta, bot.theta) + angleGap(left.theta, right.theta);
        const parallel = 1 - Math.min(0.6, skew / 30);
        const score = (sum / 4) * (sum / 4) * Math.pow(af, 0.85) * parallel - borders * 0.02;
        if (score > bestScore) { bestScore = score; best = q; }
      }
    }

    if (!best) {
      const ix = W * 0.04, iy = H * 0.04;
      return { corners: [[ix, iy], [W - ix, iy], [W - ix, H - iy], [ix, H - iy]], confident: false };
    }
    const corners = best.map(p => [clamp(p[0] / s, 0, W - 1), clamp(p[1] / s, 0, H - 1)]);
    return { corners, confident: bestScore > 0.12 };
  }

  /* ---------- perspective warp ---------- */

  function solve(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let p = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / A[i][i];
        for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
        b[r] -= f * b[i];
      }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
      x[i] = s / A[i][i];
    }
    return x;
  }

  // homography mapping points `from` onto `to`
  function perspective(from, to) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = from[i], [u, v] = to[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    return solve(A, b);
  }

  function outputSize(q, ratio) {
    let w = Math.max(dist(q[0], q[1]), dist(q[3], q[2]));
    let h = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
    if (ratio) {
      const long = Math.max(w, h);
      if (w >= h) { w = long; h = long / ratio; } else { h = long; w = long / ratio; }
    }
    return [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))];
  }

  function warp(img, q, ow, oh) {
    const H = perspective([[0, 0], [ow - 1, 0], [ow - 1, oh - 1], [0, oh - 1]], q);
    const { width: w, height: h, data: s } = img;
    const out = makeImage(ow, oh), d = out.data;
    // when shrinking a lot, sample a small 2x2 cloud to avoid aliasing
    const scale = Math.max(dist(q[0], q[1]) / ow, dist(q[0], q[3]) / oh);
    const taps = scale > 1.6 ? [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] : [[0, 0]];
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        let r = 0, g = 0, bl = 0;
        for (const [ox, oy] of taps) {
          const X = x + ox, Y = y + oy;
          const den = H[6] * X + H[7] * Y + 1;
          const sx = clamp((H[0] * X + H[1] * Y + H[2]) / den, 0, w - 1.001);
          const sy = clamp((H[3] * X + H[4] * Y + H[5]) / den, 0, h - 1.001);
          const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
          const i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
          const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
          r += s[i00] * w00 + s[i10] * w10 + s[i01] * w01 + s[i11] * w11;
          g += s[i00 + 1] * w00 + s[i10 + 1] * w10 + s[i01 + 1] * w01 + s[i11 + 1] * w11;
          bl += s[i00 + 2] * w00 + s[i10 + 2] * w10 + s[i01 + 2] * w01 + s[i11 + 2] * w11;
        }
        const o = (y * ow + x) * 4, n = taps.length;
        d[o] = r / n; d[o + 1] = g / n; d[o + 2] = bl / n; d[o + 3] = 255;
      }
    }
    return out;
  }

  /* ---------- fingers: skin detection on the flattened page ---------- */

  function detectFingers(img) {
    const { width: w, height: h, data: d } = img;
    const raw = new Float32Array(w * h);
    for (let i = 0, j = 0; i < raw.length; i++, j += 4) {
      const r = d[j], g = d[j + 1], b = d[j + 2];
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;
      const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
      raw[i] = (Y > 35 && cr >= 146 && cr <= 185 && cb >= 75 && cb <= 124 && r - g > 32 && r - b > 28) ? 1 : 0;
    }
    const rad = Math.max(1, Math.round(Math.max(w, h) / 300));
    const sm = boxBlur(raw, w, h, rad);
    const m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = sm[i] > 0.5 ? 1 : 0;

    // keep only blobs that touch the page edge (a finger holding the page)
    const band = Math.max(3, Math.round(Math.min(w, h) * 0.02));
    const minArea = w * h * 0.0015;
    const lab = new Int32Array(w * h), keep = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let id = 0;
    for (let s = 0; s < m.length; s++) {
      if (!m[s] || lab[s]) continue;
      id++;
      let sp = 0, n = 0, touches = false;
      stack[sp++] = s; lab[s] = id;
      const members = [];
      while (sp) {
        const i = stack[--sp];
        members.push(i); n++;
        const x = i % w, y = (i / w) | 0;
        if (x < band || y < band || x >= w - band || y >= h - band) touches = true;
        if (x > 0 && m[i - 1] && !lab[i - 1]) { lab[i - 1] = id; stack[sp++] = i - 1; }
        if (x < w - 1 && m[i + 1] && !lab[i + 1]) { lab[i + 1] = id; stack[sp++] = i + 1; }
        if (y > 0 && m[i - w] && !lab[i - w]) { lab[i - w] = id; stack[sp++] = i - w; }
        if (y < h - 1 && m[i + w] && !lab[i + w]) { lab[i + w] = id; stack[sp++] = i + w; }
      }
      if (touches && n >= minArea) for (const i of members) keep[i] = 1;
    }
    // grow a little so the soft shadow around the finger goes too
    const grow = Math.max(2, Math.round(Math.max(w, h) * 0.008));
    const g2 = boxBlur(Float32Array.from(keep), w, h, grow);
    const out = new Uint8Array(w * h);
    let count = 0;
    for (let i = 0; i < out.length; i++) if (g2[i] > 0.02) { out[i] = 1; count++; }
    return { mask: out, pixels: count };
  }

  /* ---------- fill masked areas so they blend with the surrounding page ---------- */

  function inpaint(img, mask) {
    const { width: W, height: H } = img;
    let any = false;
    for (let i = 0; i < mask.length; i++) if (mask[i]) { any = true; break; }
    if (!any) return img;

    const levels = [];
    let w = W, h = H;
    let rgb = new Float32Array(W * H * 3), known = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      known[i] = mask[i] ? 0 : 1;
      rgb[i * 3] = img.data[i * 4]; rgb[i * 3 + 1] = img.data[i * 4 + 1]; rgb[i * 3 + 2] = img.data[i * 4 + 2];
    }
    levels.push({ w, h, rgb, known });
    while (w > 1 || h > 1) {
      const nw = Math.max(1, (w + 1) >> 1), nh = Math.max(1, (h + 1) >> 1);
      const nrgb = new Float32Array(nw * nh * 3), nk = new Uint8Array(nw * nh), cnt = new Float32Array(nw * nh);
      let missing = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!known[i]) continue;
        const o = (y >> 1) * nw + (x >> 1);
        nrgb[o * 3] += rgb[i * 3]; nrgb[o * 3 + 1] += rgb[i * 3 + 1]; nrgb[o * 3 + 2] += rgb[i * 3 + 2];
        cnt[o]++;
      }
      for (let o = 0; o < nw * nh; o++) {
        if (cnt[o]) { nrgb[o * 3] /= cnt[o]; nrgb[o * 3 + 1] /= cnt[o]; nrgb[o * 3 + 2] /= cnt[o]; nk[o] = 1; }
        else missing++;
      }
      w = nw; h = nh; rgb = nrgb; known = nk;
      levels.push({ w, h, rgb, known });
      if (!missing) break;
    }
    // coarsest level: if anything is still unknown, fall back to a neutral paper white
    const top = levels[levels.length - 1];
    for (let i = 0; i < top.w * top.h; i++) if (!top.known[i]) { top.rgb[i * 3] = top.rgb[i * 3 + 1] = top.rgb[i * 3 + 2] = 235; }

    for (let L = levels.length - 2; L >= 0; L--) {
      const f = levels[L], c = levels[L + 1];
      const holes = [];
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        if (f.known[i]) continue;
        holes.push(i);
        const cx = clamp((x - 0.5) / 2, 0, c.w - 1), cy = clamp((y - 0.5) / 2, 0, c.h - 1);
        const x0 = Math.floor(cx), y0 = Math.floor(cy), x1 = Math.min(c.w - 1, x0 + 1), y1 = Math.min(c.h - 1, y0 + 1);
        const fx = cx - x0, fy = cy - y0;
        for (let k = 0; k < 3; k++) {
          const a = c.rgb[(y0 * c.w + x0) * 3 + k], b = c.rgb[(y0 * c.w + x1) * 3 + k];
          const cc = c.rgb[(y1 * c.w + x0) * 3 + k], dd = c.rgb[(y1 * c.w + x1) * 3 + k];
          f.rgb[i * 3 + k] = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + dd * fx) * fy;
        }
      }
      // relax the hole so it meets its known border smoothly
      for (let it = 0; it < 6; it++) {
        for (const i of holes) {
          const x = i % f.w, y = (i / f.w) | 0;
          const nb = [x > 0 ? i - 1 : i, x < f.w - 1 ? i + 1 : i, y > 0 ? i - f.w : i, y < f.h - 1 ? i + f.w : i];
          for (let k = 0; k < 3; k++) {
            f.rgb[i * 3 + k] = (f.rgb[nb[0] * 3 + k] + f.rgb[nb[1] * 3 + k] + f.rgb[nb[2] * 3 + k] + f.rgb[nb[3] * 3 + k]) / 4;
          }
        }
      }
    }
    const out = makeImage(W, H), fin = levels[0].rgb;
    out.data.set(img.data);
    for (let i = 0; i < W * H; i++) {
      if (!mask[i]) continue;
      out.data[i * 4] = fin[i * 3]; out.data[i * 4 + 1] = fin[i * 3 + 1]; out.data[i * 4 + 2] = fin[i * 3 + 2];
    }
    return out;
  }

  /* ---------- scanner look ---------- */

  // per-channel paper brightness map (bright percentile per block, smoothed)
  function paperMap(img) {
    const { width: w, height: h, data: d } = img;
    const block = Math.max(8, Math.round(Math.max(w, h) / 36));
    const bw = Math.ceil(w / block), bh = Math.ceil(h / block), nb = bw * bh;
    const hist = new Uint32Array(nb * 3 * 64), cnt = new Uint32Array(nb);
    for (let y = 0; y < h; y += 2) {
      const by = ((y / block) | 0) * bw;
      for (let x = 0; x < w; x += 2) {
        const b = by + ((x / block) | 0), i = (y * w + x) * 4;
        cnt[b]++;
        hist[(b * 3) * 64 + (d[i] >> 2)]++;
        hist[(b * 3 + 1) * 64 + (d[i + 1] >> 2)]++;
        hist[(b * 3 + 2) * 64 + (d[i + 2] >> 2)]++;
      }
    }
    const maps = [new Float32Array(nb), new Float32Array(nb), new Float32Array(nb)];
    for (let b = 0; b < nb; b++) for (let k = 0; k < 3; k++) {
      const base = (b * 3 + k) * 64, target = cnt[b] * 0.9;
      let run = 0, v = 255;
      for (let bin = 0; bin < 64; bin++) { run += hist[base + bin]; if (run >= target) { v = bin * 4 + 2; break; } }
      maps[k][b] = v;
    }
    // max filter (ignores ink-heavy blocks) then smooth
    for (let k = 0; k < 3; k++) {
      const m = maps[k], mx = new Float32Array(nb);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        let v = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = clamp(x + dx, 0, bw - 1), yy = clamp(y + dy, 0, bh - 1);
          v = Math.max(v, m[yy * bw + xx]);
        }
        mx[y * bw + x] = v;
      }
      maps[k] = boxBlur(boxBlur(mx, bw, bh, 1), bw, bh, 1);
    }
    return { maps, bw, bh, block };
  }

  function sampleMap(pm, k, x, y) {
    const fx = clamp(x / pm.block - 0.5, 0, pm.bw - 1), fy = clamp(y / pm.block - 0.5, 0, pm.bh - 1);
    const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(pm.bw - 1, x0 + 1), y1 = Math.min(pm.bh - 1, y0 + 1);
    const ax = fx - x0, ay = fy - y0, m = pm.maps[k];
    return (m[y0 * pm.bw + x0] * (1 - ax) + m[y0 * pm.bw + x1] * ax) * (1 - ay) +
           (m[y1 * pm.bw + x0] * (1 - ax) + m[y1 * pm.bw + x1] * ax) * ay;
  }

  function applyLook(img, mode) {
    if (mode === 'original') return img;
    const { width: w, height: h, data: s } = img;
    const pm = paperMap(img);
    const out = makeImage(w, h), d = out.data;
    const black = 0.1, white = 0.9;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const n = [0, 0, 0];
        for (let k = 0; k < 3; k++) {
          let v = s[i + k] / Math.max(24, sampleMap(pm, k, x, y));
          v = clamp((v - black) / (white - black), 0, 1);
          n[k] = Math.pow(v, 1.25);
        }
        if (mode === 'color') {
          const l = 0.299 * n[0] + 0.587 * n[1] + 0.114 * n[2];
          for (let k = 0; k < 3; k++) d[i + k] = clamp(l + (n[k] - l) * 1.25, 0, 1) * 255;
        } else {
          const l = 0.299 * n[0] + 0.587 * n[1] + 0.114 * n[2];
          const v = mode === 'bw' ? clamp((l - 0.62) / 0.16, 0, 1) : l;
          d[i] = d[i + 1] = d[i + 2] = v * 255;
        }
        d[i + 3] = 255;
      }
    }
    return out;
  }

  function sharpen(img, amount) {
    if (!amount) return img;
    const { width: w, height: h, data: s } = img;
    const out = makeImage(w, h), d = out.data, ch = new Float32Array(w * h);
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < w * h; i++) ch[i] = s[i * 4 + k];
      const bl = boxBlur(ch, w, h, 1);
      for (let i = 0; i < w * h; i++) d[i * 4 + k] = ch[i] + amount * (ch[i] - bl[i]);
    }
    for (let i = 0; i < w * h; i++) d[i * 4 + 3] = 255;
    return out;
  }

  /* ---------- resize (Catmull-Rom bicubic) and rotate ---------- */

  function cubic(t) {
    t = Math.abs(t);
    if (t < 1) return 1.5 * t * t * t - 2.5 * t * t + 1;
    if (t < 2) return -0.5 * t * t * t + 2.5 * t * t - 4 * t + 2;
    return 0;
  }

  function resize(img, nw, nh) {
    const { width: w, height: h, data: s } = img;
    if (nw === w && nh === h) return img;
    const tmp = new Float32Array(nw * h * 3);
    const sx = w / nw, sy = h / nh;
    for (let x = 0; x < nw; x++) {
      const cx = (x + 0.5) * sx - 0.5, x0 = Math.floor(cx);
      const wt = [cubic(cx - (x0 - 1)), cubic(cx - x0), cubic(cx - (x0 + 1)), cubic(cx - (x0 + 2))];
      const sum = wt[0] + wt[1] + wt[2] + wt[3];
      for (let y = 0; y < h; y++) for (let k = 0; k < 3; k++) {
        let v = 0;
        for (let t = 0; t < 4; t++) v += wt[t] * s[(y * w + clamp(x0 - 1 + t, 0, w - 1)) * 4 + k];
        tmp[(y * nw + x) * 3 + k] = v / sum;
      }
    }
    const out = makeImage(nw, nh), d = out.data;
    for (let y = 0; y < nh; y++) {
      const cy = (y + 0.5) * sy - 0.5, y0 = Math.floor(cy);
      const wt = [cubic(cy - (y0 - 1)), cubic(cy - y0), cubic(cy - (y0 + 1)), cubic(cy - (y0 + 2))];
      const sum = wt[0] + wt[1] + wt[2] + wt[3];
      for (let x = 0; x < nw; x++) {
        const o = (y * nw + x) * 4;
        for (let k = 0; k < 3; k++) {
          let v = 0;
          for (let t = 0; t < 4; t++) v += wt[t] * tmp[(clamp(y0 - 1 + t, 0, h - 1) * nw + x) * 3 + k];
          d[o + k] = v / sum;
        }
        d[o + 3] = 255;
      }
    }
    return out;
  }

  // quarter turns clockwise
  function rotate(img, turns) {
    turns = ((turns % 4) + 4) % 4;
    if (!turns) return img;
    const { width: w, height: h, data: s } = img;
    const ow = turns % 2 ? h : w, oh = turns % 2 ? w : h;
    const out = makeImage(ow, oh), d = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let nx, ny;
      if (turns === 1) { nx = h - 1 - y; ny = x; }
      else if (turns === 2) { nx = w - 1 - x; ny = h - 1 - y; }
      else { nx = y; ny = w - 1 - x; }
      const i = (y * w + x) * 4, o = (ny * ow + nx) * 4;
      d[o] = s[i]; d[o + 1] = s[i + 1]; d[o + 2] = s[i + 2]; d[o + 3] = 255;
    }
    return out;
  }

  /* ---------- masks from brush strokes (normalized page coordinates) ---------- */

  function rasterStrokes(strokes, w, h) {
    const m = new Uint8Array(w * h), long = Math.max(w, h);
    for (const st of strokes) {
      const r = Math.max(1, st.r * long);
      const pts = st.pts;
      for (let p = 0; p < pts.length; p++) {
        const a = pts[p], b = pts[Math.min(pts.length - 1, p + 1)];
        const steps = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * w, (b[1] - a[1]) * h) / (r / 2)));
        for (let k = 0; k <= steps; k++) {
          const cx = (a[0] + (b[0] - a[0]) * k / steps) * w, cy = (a[1] + (b[1] - a[1]) * k / steps) * h;
          const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
          const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) m[y * w + x] = 1;
          }
        }
      }
    }
    return m;
  }

  function scaleMask(mask, w, h, nw, nh) {
    if (w === nw && h === nh) return mask;
    const out = new Uint8Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      const sy = Math.min(h - 1, (y * h / nh) | 0) * w;
      for (let x = 0; x < nw; x++) out[y * nw + x] = mask[sy + Math.min(w - 1, (x * w / nw) | 0)];
    }
    return out;
  }

  /* ---------- tiny PDF writer: one JPEG per page ---------- */

  function jpegPdf(jpegBytes, pxW, pxH, dpi) {
    const pw = (pxW * 72 / dpi).toFixed(2), ph = (pxH * 72 / dpi).toFixed(2);
    const enc = new TextEncoder(), parts = [], offsets = [];
    let len = 0;
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      null,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    ];
    for (let i = 0; i < objs.length; i++) {
      offsets.push(len);
      if (i === 3) {
        push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
        push(jpegBytes);
        push('\nendstream\nendobj\n');
      } else {
        push(`${i + 1} 0 obj\n${objs[i]}\nendobj\n`);
      }
    }
    const xref = len;
    let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) x += String(o).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(len);
    let p = 0;
    for (const b of parts) { out.set(b, p); p += b.length; }
    return out;
  }

  const api = {
    makeImage, detectCorners, perspective, outputSize, warp, detectFingers, inpaint,
    applyLook, sharpen, resize, rotate, rasterStrokes, scaleMask, jpegPdf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScanEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
