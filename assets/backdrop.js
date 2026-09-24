/* ============================================================
   techtuate "Flow" backdrop - animated WebGL silk behind every page.
   Include on every redesigned page:  <script src="/assets/backdrop.js" defer></script>
   It uses <canvas class="tt-backdrop"> if the page has one, otherwise
   creates it (plus the vignette). Without WebGL the canvas keeps its CSS
   gradient fallback from flow.css. Runs locally, fetches nothing.
   ============================================================ */
(function () {
  'use strict';

  // Production mood: Ember. Others kept for reference / quick swaps.
  var MOODS = {
    Ember:    { a: [0.16, 0.07, 0.34], b: [0.42, 0.06, 0.28], c: [1.0, 0.80, 0.10] },
    Aurora:   { a: [0.03, 0.16, 0.26], b: [0.05, 0.34, 0.30], c: [0.55, 1.0, 0.80] },
    Nocturne: { a: [0.08, 0.06, 0.30], b: [0.30, 0.05, 0.42], c: [1.0, 0.45, 0.80] }
  };
  var MOOD = MOODS.Ember;

  var FRAG = [
    'precision highp float;',
    'uniform vec2 r; uniform float t; uniform vec2 m; uniform vec3 ca, cb, cc;',
    'float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
    'float ns(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);',
    '  return mix(mix(hs(i),hs(i+vec2(1,0)),u.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),u.x), u.y); }',
    'float fbm(vec2 p){ float v=0., a=.5; mat2 R=mat2(.8,.6,-.6,.8); for(int i=0;i<5;i++){ v+=a*ns(p); p=R*p*2.02; a*=.5; } return v; }',
    'void main(){',
    '  vec2 p=(gl_FragCoord.xy-.5*r)/r.y;',
    '  p += (m-.5)*vec2(.22,-.14);',
    '  float T=t*.045;',
    '  vec2 q=vec2(fbm(p*1.3+vec2(0.,T)), fbm(p*1.3+vec2(5.2,-T)));',
    '  vec2 w=vec2(fbm(p*1.1+2.2*q+vec2(1.7,9.2)+T*1.4), fbm(p*1.1+2.2*q+vec2(8.3,2.8)-T*.9));',
    '  float f=fbm(p*1.05+2.6*w);',
    '  float silk=sin((p.y*1.3+p.x*.35+w.x*1.6+f*1.4)*7.5 - T*6.)*.5+.5;',
    '  float fine=pow(silk,14.);',
    '  silk=pow(silk,4.);',
    '  vec3 col=vec3(.018,.014,.03);',
    '  col=mix(col, ca, smoothstep(.15,.85,f));',
    '  col=mix(col, cb, smoothstep(.45,1.05,w.y)*.75);',
    '  col+= cb*silk*smoothstep(.35,.8,f)*.35;',
    '  col+= cc*fine*smoothstep(.5,.85,f)*.75;',
    '  col+= cc*pow(smoothstep(.62,.95,f),3.)*.22;',
    '  float vig=smoothstep(1.45,.15,length(p*vec2(.75,1.)));',
    '  col*= .25+.75*vig;',
    '  col+= (hs(gl_FragCoord.xy+fract(t)*97.)-.5)*.035;',
    '  gl_FragColor=vec4(max(col,0.),1.);',
    '}'
  ].join('\n');

  function init() {
    var canvas = document.querySelector('canvas.tt-backdrop');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'tt-backdrop';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    if (!document.querySelector('.tt-vignette')) {
      var v = document.createElement('div');
      v.className = 'tt-vignette';
      v.setAttribute('aria-hidden', 'true');
      canvas.parentNode.insertBefore(v, canvas.nextSibling);
    }

    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return; // CSS gradient fallback stays visible

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    var fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = function (n) { return gl.getUniformLocation(pr, n); };
    var u = { r: U('r'), t: U('t'), m: U('m'), a: U('ca'), b: U('cb'), c: U('cc') };
    gl.uniform3fv(u.a, MOOD.a); gl.uniform3fv(u.b, MOOD.b); gl.uniform3fv(u.c, MOOD.c);

    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var speed = reduce ? 0.15 : 1;
    var mouse = [0.5, 0.5], target = [0.5, 0.5];
    window.addEventListener('pointermove', function (e) {
      target = [e.clientX / window.innerWidth, e.clientY / window.innerHeight];
    }, { passive: true });

    var time = 20, last = performance.now(), raf = 0;
    var SCALE = 0.5; // render at half CSS resolution

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000); // cap each step at 50ms
      last = now;
      time += dt * speed;
      var w = Math.max(1, Math.floor(canvas.clientWidth * SCALE));
      var h = Math.max(1, Math.floor(canvas.clientHeight * SCALE));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      mouse[0] += (target[0] - mouse[0]) * 0.03;
      mouse[1] += (target[1] - mouse[1]) * 0.03;
      gl.uniform2f(u.r, w, h);
      gl.uniform1f(u.t, time);
      gl.uniform2f(u.m, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); });
    if (!document.hidden) start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
