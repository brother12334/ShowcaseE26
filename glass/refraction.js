/* Apply baked RGB ray coordinates to the live hero number. The native video
 * still supplies the glass surface, highlights and shadows. */
(function () {
  const vertex = `#version 300 es
    in vec2 point;
    out vec2 uv;
    void main() {
      gl_Position = vec4(point, 0., 1.);
      uv = vec2(point.x + 1., 1. - point.y) * .5;
    }`;
  const fragment = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec4 color;
    uniform sampler2D redGreen;
    uniform sampler2D blueLight;
    uniform sampler2D glyph;
    uniform sampler2D softGlyph;
    uniform vec2 offsets[2];
    uniform vec2 extent;
    uniform vec2 halfTexel;
    uniform float phase;
    uniform vec3 ink;

    float transmitted(vec2 target) {
      // An outward ray can miss the number canvas. Fade at its edge instead
      // of repeating the last column of a glyph across the glass.
      vec2 edge = min(target, 1. - target);
      return texture(softGlyph, target).a * smoothstep(0., .006, min(edge.x, edge.y));
    }

    void main() {
      vec2 pos = clamp(uv * extent, halfTexel, extent - halfTexel);
      vec2 a = offsets[0] + pos;
      vec2 b = offsets[1] + pos;
      vec4 lightA = texture(blueLight, a);
      vec4 lightB = texture(blueLight, b);
      vec4 light = mix(lightA, lightB, phase);
      // Interpolate coordinates only where both poses transmit light. A blank
      // texel from a moving edge must not steer a ray through the glyph.
      float weight = light.b > .001 ? phase * lightB.b / light.b : phase;
      vec4 rg = mix(texture(redGreen, a), texture(redGreen, b), weight);
      vec2 blue = mix(lightA.rg, lightB.rg, weight);
      float original = texture(glyph, uv).a;
      vec3 rays = vec3(transmitted(rg.rg), transmitted(rg.ba), transmitted(blue)) * light.b;
      float opacity = max(rays.r, max(rays.g, rays.b));
      color = mix(vec4(ink * original, original),
                  vec4(ink * rays, opacity), light.a);
    }`;

  function unpackPlane(data, start, width, height) {
    const pixels = width * height, size = pixels * 4;
    const lo = new Uint8Array(data, start, size);
    const hi = new Uint8Array(data, start + size, size);
    const output = new Uint16Array(size);
    // Reassemble the planar, row-delta-coded half-float channels for WebGL.
    for (let channel = 0; channel < 4; channel++) {
      const base = channel * pixels;
      for (let row = 0; row < height; row++) {
        let value = 0;
        const rowStart = row * width;
        for (let x = rowStart; x < rowStart + width; x++) {
          value += lo[base + x] | (hi[base + x] << 8);
          output[x * 4 + channel] = value;
        }
      }
    }
    return output;
  }

  async function loadRays(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok || !response.body) throw new Error('Refraction map unavailable');
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    const data = await new Response(stream).arrayBuffer();
    const header = new DataView(data);
    if (data.byteLength < 12 || header.getUint32(0) !== 0x45323650) {
      throw new Error('Unsupported refraction map');
    }
    const [width, height, frames, columns] = [4, 6, 8, 10].map(i => header.getUint16(i, true));
    const atlasWidth = width * columns, atlasHeight = height * Math.ceil(frames / columns);
    const size = atlasWidth * atlasHeight * 4;
    if (!width || !height || !frames || !columns || data.byteLength !== 12 + 4 * size) {
      throw new Error('Invalid refraction map');
    }
    return { width, height, frames, columns, atlasWidth, atlasHeight,
      planes: [unpackPlane(data, 12, atlasWidth, atlasHeight),
        unpackPlane(data, 12 + 2 * size, atlasWidth, atlasHeight)] };
  }

  function createLens(canvas, rays) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false,
      premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('Refraction compositor unavailable');
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      throw new Error('Refraction compositor not supported');
    }
    gl.useProgram(program);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const point = gl.getAttribLocation(program, 'point');
    gl.enableVertexAttribArray(point);
    gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);

    const textures = ['redGreen', 'blueLight', 'glyph', 'softGlyph'].map((name, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
      if (unit < 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, rays.atlasWidth,
        rays.atlasHeight, 0, gl.RGBA, gl.HALF_FLOAT, rays.planes[unit]);
      return texture;
    });
    if (gl.getError() !== gl.NO_ERROR) {
      for (const texture of textures) gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      throw new Error('Refraction textures not supported');
    }
    const offsets = gl.getUniformLocation(program, 'offsets[0]');
    const phase = gl.getUniformLocation(program, 'phase');
    const ink = gl.getUniformLocation(program, 'ink');
    gl.uniform2f(gl.getUniformLocation(program, 'extent'),
      rays.width / rays.atlasWidth, rays.height / rays.atlasHeight);
    gl.uniform2f(gl.getUniformLocation(program, 'halfTexel'),
      .5 / rays.atlasWidth, .5 / rays.atlasHeight);

    return {
      glyph(bitmap, soft, color) {
        if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
        }
        gl.viewport(0, 0, bitmap.width, bitmap.height);
        gl.uniform3fv(ink, color);
        gl.activeTexture(gl.TEXTURE2);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.activeTexture(gl.TEXTURE3);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, soft);
      },
      draw(position) {
        const frame = Math.floor(position);
        const next = (frame + 1) % rays.frames;
        gl.uniform2fv(offsets, [
          (frame % rays.columns) / rays.columns, Math.floor(frame / rays.columns) * rays.height / rays.atlasHeight,
          (next % rays.columns) / rays.columns, Math.floor(next / rays.columns) * rays.height / rays.atlasHeight]);
        gl.uniform1f(phase, position - frame);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      dispose() {
        for (const texture of textures) gl.deleteTexture(texture);
        gl.deleteBuffer(quad);
        gl.deleteProgram(program);
      }
    };
  }

  function paintGlyph(bitmap, canvas, number, anchor, density) {
    const bounds = anchor.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !number.firstChild) return null;
    const band = number.parentElement.getBoundingClientRect();
    Object.assign(canvas.style, {
      left: bounds.left - band.left + 'px', top: bounds.top - band.top + 'px',
      width: bounds.width + 'px', height: bounds.height + 'px'
    });
    bitmap.width = Math.round(bounds.width * density);
    bitmap.height = Math.round(bounds.height * density);
    const ctx = bitmap.getContext('2d');
    if (!ctx) return null;
    const style = getComputedStyle(number);
    ctx.scale(bitmap.width / bounds.width, bitmap.height / bounds.height);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    const spacing = parseFloat(style.letterSpacing) || 0;
    const range = document.createRange();
    const text = number.firstChild;
    if (text.nodeType !== Node.TEXT_NODE) return null;
    for (let i = 0; i < text.length; i++) {
      const char = text.data[i];
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      const box = range.getBoundingClientRect();
      const metrics = ctx.measureText(char);
      const ascent = metrics.fontBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent;
      if (!Number.isFinite(ascent + descent)) return null;
      const baseline = box.top + (box.height + ascent - descent) / 2;
      ctx.fillText(char, box.left - bounds.left + (box.width - spacing) / 2, baseline - bounds.top);
    }
    return style.color.match(/[\d.]+/g)?.slice(0, 3).map(value => Number(value) / 255);
  }

  function start(anchor, video, url) {
    if (!window.DecompressionStream || !video.requestVideoFrameCallback) return null;
    const controller = new AbortController();
    const canvas = document.createElement('canvas');
    canvas.className = 'glass-refraction';
    canvas.setAttribute('aria-hidden', 'true');
    const bitmap = document.createElement('canvas');
    const soft = document.createElement('canvas');
    let lens, observer, number, request = 0, seen = '', dirty = true, previous = -1;
    let density = Math.min(devicePixelRatio || 1, 1.25);
    let quality = video.getVideoPlaybackQuality?.();
    let qualityAt = performance.now();
    function stop() {
      controller.abort();
      video.cancelVideoFrameCallback(request);
      observer?.disconnect();
      number?.removeAttribute('data-glass-lensed');
      canvas.remove();
      lens?.dispose();
      lens = null;
    }
    canvas.addEventListener('webglcontextlost', stop, { once: true });
    Promise.all([loadRays(url, controller.signal), document.fonts.ready]).then(([rays]) => {
      if (controller.signal.aborted || !video.isConnected) return;
      lens = createLens(canvas, rays);
      rays.planes.length = 0;
      const stage = anchor.closest('#stage');
      if (!stage) { stop(); return; }
      observer = new ResizeObserver(() => { dirty = true; });
      observer.observe(anchor);
      function tick(now, metadata) {
        if (controller.signal.aborted) return;
        if (density > 1 && quality && now - qualityAt > 1000) {
          const current = video.getVideoPlaybackQuality();
          const shown = current.totalVideoFrames - quality.totalVideoFrames;
          const dropped = current.droppedVideoFrames - quality.droppedVideoFrames;
          if (shown > 20 && dropped / shown > .12) {
            density = 1;
            dirty = true;
          }
          quality = current;
          qualityAt = now;
        }
        const next = stage.querySelector('.dg-num');
        const value = next?.textContent;
        const needsGlyph = dirty || next !== number || value !== seen;
        if (needsGlyph) {
          number?.removeAttribute('data-glass-lensed');
          number = next;
          seen = value;
          dirty = false;
          const color = next && paintGlyph(bitmap, canvas, next, anchor, density);
          if (color?.length !== 3) { stop(); return; }
          soft.width = bitmap.width;
          soft.height = bitmap.height;
          const ctx = soft.getContext('2d');
          if (!ctx) { stop(); return; }
          // Match the baked hero's soft transmitted light while keeping
          // the glyph outside the silhouette crisp.
          ctx.filter = `blur(${1.4 * bitmap.width / 390}px)`;
          ctx.drawImage(bitmap, 0, 0);
          lens.glyph(bitmap, soft, color);
        }
        const frame = (metadata.mediaTime / video.duration * rays.frames) % rays.frames;
        if (Number.isFinite(frame) && (frame !== previous || needsGlyph)) {
          lens.draw(frame);
          previous = frame;
          if (!canvas.isConnected) number.parentElement.append(canvas);
          number.setAttribute('data-glass-lensed', '');
        }
        request = video.requestVideoFrameCallback(tick);
      }
      request = video.requestVideoFrameCallback(tick);
    }).catch(stop);
    return stop;
  }

  window.GlassRefraction = { start };
})();
