(() => {
  const gateId = "welcomeGate";

  function clearWelcomeQuery() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("welcome")) return;

    url.searchParams.delete("welcome");
    const query = url.searchParams.toString();
    const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  function createGate() {
    if (document.getElementById(gateId)) return null;

    const gate = document.createElement("section");
    gate.id = gateId;
    gate.className = "welcome-gate";
    gate.setAttribute("aria-label", "Welcome Gate");
    gate.innerHTML = `
      <canvas class="welcome-gate__canvas" aria-hidden="true"></canvas>
      <div class="welcome-gate__overlay" aria-hidden="true"></div>
      <canvas class="welcome-gate__burn" aria-hidden="true"></canvas>
      <div class="welcome-gate__panel">
        <p class="welcome-gate__kicker">Data Flow Protocol</p>
        <h1 class="welcome-gate__title">
          <span>DAYDREAM</span>
          <span>NATION</span>
        </h1>
        <p class="welcome-gate__desc" aria-hidden="true">&nbsp;</p>
        <button class="welcome-gate__button" type="button" aria-label="Noise Button">
          <canvas class="welcome-gate__button-canvas" aria-hidden="true"></canvas>
          <span class="welcome-gate__button-label">Noise Button</span>
        </button>
      </div>
    `;
    document.body.appendChild(gate);
    return gate;
  }

  function startCanvasFlow(gate) {
    const canvas = gate.querySelector(".welcome-gate__canvas");
    if (!canvas) return () => {};

    const context = canvas.getContext("2d");
    if (!context) return () => {};

    const chars = "01{}[]<>/\\*#%&$+-=アイウエオカキクケコサシスセソ";
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;
    let fontSize = 14;
    let columns = 0;
    let drops = [];
    let rafId = 0;
    let lastTick = 0;
    let running = true;

    const setup = () => {
      const rect = gate.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      fontSize = width < 680 ? 12 : 14;
      columns = Math.max(1, Math.floor(width / fontSize));
      drops = Array.from({ length: columns }, () => Math.random() * (height / fontSize));
      context.fillStyle = "rgba(3, 8, 18, 0.3)";
      context.fillRect(0, 0, width, height);
    };

    const draw = (timestamp) => {
      if (!running) return;
      if (timestamp - lastTick < 40) {
        rafId = window.requestAnimationFrame(draw);
        return;
      }
      lastTick = timestamp;

      context.fillStyle = "rgba(3, 8, 18, 0.17)";
      context.fillRect(0, 0, width, height);
      context.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let index = 0; index < columns; index += 1) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = index * fontSize;
        const y = drops[index] * fontSize;
        const alpha = 0.32 + Math.random() * 0.5;

        context.fillStyle = `rgba(0, 255, 157, ${alpha})`;
        context.fillText(text, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[index] = 0;
        } else {
          drops[index] += 0.72 + Math.random() * 0.62;
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    const onResize = () => {
      window.cancelAnimationFrame(rafId);
      setup();
      if (running) {
        rafId = window.requestAnimationFrame(draw);
      }
    };

    setup();
    rafId = window.requestAnimationFrame(draw);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      running = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }

  function startBurningReveal(gate, options = {}) {
    const canvas = gate?.querySelector(".welcome-gate__burn");
    if (!canvas) {
      return { active: false, duration: 0, stop: () => {} };
    }

    const duration = Math.max(100, options.duration || 1120);
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      return { active: false, duration: 0, stop: () => {} };
    }

    const vertexShaderSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;

      void main() {
        vUv = a_position;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      varying vec2 vUv;
      uniform vec2 u_resolution;
      uniform float u_progress;
      uniform float u_time;

      float rand(vec2 n) {
        return fract(cos(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
      }

      float noise(vec2 n) {
        const vec2 d = vec2(0.0, 1.0);
        vec2 b = floor(n);
        vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
        return mix(
          mix(rand(b), rand(b + d.yx), f.x),
          mix(rand(b + d.xy), rand(b + d.yy), f.x),
          f.y
        );
      }

      float fbm(vec2 n) {
        float total = 0.0;
        float amplitude = 0.4;
        for (int i = 0; i < 4; i++) {
          total += noise(n) * amplitude;
          n += n;
          amplitude *= 0.6;
        }
        return total;
      }

      void main() {
        vec2 uv = vUv;
        uv.x *= min(1.0, u_resolution.x / u_resolution.y);
        uv.y *= min(1.0, u_resolution.y / u_resolution.x);

        float t = u_progress;
        vec3 color = vec3(0.12, 0.045, 0.01);

        float main_noise = 1.0 - fbm(0.75 * uv + 10.0 - vec2(0.3, 0.9 * t));
        float paper_darkness = smoothstep(main_noise - 0.1, main_noise, t);
        color -= vec3(0.78, 0.52, 0.34) * paper_darkness;

        vec3 fire_color = fbm(6.0 * uv - vec2(0.0, 0.005 * u_time)) * vec3(9.2, 3.2, 0.25);
        float show_fire = smoothstep(0.35, 0.88, fbm(10.0 * uv + 2.0 - vec2(0.0, 0.005 * u_time)));
        show_fire += smoothstep(0.64, 0.78, fbm(0.5 * uv + 5.0 - vec2(0.0, 0.001 * u_time)));

        float fire_border = 0.03 * show_fire;
        float fire_edge = smoothstep(main_noise - fire_border, main_noise - 0.5 * fire_border, t);
        fire_edge *= (1.0 - smoothstep(main_noise - 0.5 * fire_border, main_noise, t));
        color += fire_color * fire_edge;

        float edge_glow = smoothstep(main_noise - 0.08, main_noise + 0.01, t) * (1.0 - paper_darkness);
        color += vec3(1.0, 0.34, 0.03) * edge_glow * 0.24;

        float ember_noise = fbm(32.0 * uv + vec2(1.3 * u_time, -0.8 * u_time));
        float embers = smoothstep(0.93, 0.995, ember_noise) * fire_edge;
        color += vec3(1.0, 0.62, 0.18) * embers * 1.6;

        color = pow(max(color, vec3(0.0)), vec3(0.92));

        float opacity = 1.0 - smoothstep(main_noise - 0.0005, main_noise, t);
        gl_FragColor = vec4(color, opacity);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return { active: false, duration: 0, stop: () => {} };
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return { active: false, duration: 0, stop: () => {} };
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return { active: false, duration: 0, stop: () => {} };
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return { active: false, duration: 0, stop: () => {} };
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    const uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      progress: gl.getUniformLocation(program, "u_progress"),
      time: gl.getUniformLocation(program, "u_time"),
    };

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    let rafId = 0;
    let running = true;
    const startTime = performance.now();

    const easeInOut = (value) => {
      if (value < 0.5) return 2 * value * value;
      return 1 - Math.pow(-2 * value + 2, 2) / 2;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(window.innerWidth));
      const height = Math.max(1, Math.floor(window.innerHeight));

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    };

    const render = (timestamp) => {
      if (!running) return;

      const elapsed = timestamp - startTime;
      const normalized = Math.min(1, Math.max(0, elapsed / duration));
      const progress = 0.3 + 0.7 * easeInOut(normalized);

      gl.useProgram(program);
      gl.uniform1f(uniforms.progress, progress);
      gl.uniform1f(uniforms.time, timestamp * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (normalized < 1) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    const onResize = () => {
      resize();
    };

    resize();
    rafId = window.requestAnimationFrame(render);
    window.addEventListener("resize", onResize, { passive: true });

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };

    return { active: true, duration, stop };
  }

  function startButtonNoise(button, reduceMotion) {
    const canvas = button.querySelector(".welcome-gate__button-canvas");
    if (!canvas) return () => {};

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
    });
    if (!gl) return () => {};

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_tap;
      uniform float u_speed;
      uniform float u_amplitude;
      uniform float u_pulseMin;
      uniform float u_pulseMax;
      uniform float u_noiseType;

      float hash(float n) {
        return fract(sin(n) * 753.5453123);
      }

      float noiseHash(vec2 x) {
        vec2 p = floor(x);
        vec2 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);

        float n = p.x + p.y * 157.0;
        return mix(
          mix(hash(n + 0.0), hash(n + 1.0), f.x),
          mix(hash(n + 157.0), hash(n + 158.0), f.x),
          f.y
        );
      }

      float noiseTrig(vec2 p) {
        float x = p.x;
        float y = p.y;

        float n = sin(x * 1.0 + sin(y * 1.3)) * 0.5;
        n += sin(y * 1.0 + sin(x * 1.1)) * 0.5;
        n += sin((x + y) * 0.5) * 0.25;
        n += sin((x - y) * 0.7) * 0.25;

        return n * 0.5 + 0.5;
      }

      float noise(vec2 p) {
        if (u_noiseType < 0.5) {
          return noiseHash(p);
        }
        return noiseTrig(p);
      }

      float fbm(vec2 p, vec3 a) {
        float v = 0.0;
        v += noise(p * a.x) * 0.50;
        v += noise(p * a.y) * 1.50;
        v += noise(p * a.z) * 0.0125;
        return v;
      }

      vec3 drawLines(vec2 uv, vec3 fbmOffset, vec3 color1, float secs) {
        float timeVal = secs * 0.1;
        vec3 finalColor = vec3(0.0);

        vec3 colorSets[4];
        colorSets[0] = vec3(0.7, 0.05, 1.0);
        colorSets[1] = vec3(1.0, 0.19, 0.0);
        colorSets[2] = vec3(0.0, 1.0, 0.3);
        colorSets[3] = vec3(0.0, 0.38, 1.0);

        for (int i = 0; i < 4; i++) {
          float indexAsFloat = float(i);
          float amp = u_amplitude + (indexAsFloat * 0.0);
          float period = 2.0 + (indexAsFloat + 2.0);
          float thickness = mix(0.4, 0.2, noise(uv * 2.0));

          float t = abs(1.0 / (sin(uv.y + fbm(uv + timeVal * period, fbmOffset)) * amp) * thickness);
          finalColor += t * colorSets[i];
        }

        for (int i = 0; i < 4; i++) {
          float indexAsFloat = float(i);
          float amp = (u_amplitude * 0.5) + (indexAsFloat * 5.0);
          float period = 9.0 + (indexAsFloat + 2.0);
          float thickness = mix(0.1, 0.1, noise(uv * 12.0));

          float t = abs(1.0 / (sin(uv.y + fbm(uv + timeVal * period, fbmOffset)) * amp) * thickness);
          finalColor += t * colorSets[i] * color1;
        }

        return finalColor;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy / u_resolution.x) - 1.0;
        uv *= 1.5;

        vec3 lineColor1 = vec3(1.0, 0.0, 0.5);
        vec3 lineColor2 = vec3(0.3, 0.5, 1.5);
        float spread = abs(u_tap);

        float t = sin(u_time) * 0.5 + 0.5;
        float pulse = mix(u_pulseMin, u_pulseMax, t);

        vec3 finalColor = drawLines(uv, vec3(65.2, 40.0, 4.0), lineColor1, u_time * u_speed) * pulse;
        finalColor += drawLines(uv, vec3(5.0 * spread / 2.0, 2.1 * spread, 1.0), lineColor2, u_time * u_speed);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return () => {};
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return () => {};
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return () => {};
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return () => {};
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    const uniformLocations = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      tap: gl.getUniformLocation(program, "u_tap"),
      speed: gl.getUniformLocation(program, "u_speed"),
      amplitude: gl.getUniformLocation(program, "u_amplitude"),
      pulseMin: gl.getUniformLocation(program, "u_pulseMin"),
      pulseMax: gl.getUniformLocation(program, "u_pulseMax"),
      noiseType: gl.getUniformLocation(program, "u_noiseType"),
    };

    const config = {
      noiseType: 1.0,
      restingSpeed: 0.35,
      restingAmplitude: 80,
      restingPulseMin: 0.05,
      restingPulseMax: 0.2,
      restingTap: 1.0,
      activeSpeed: 2.8,
      activeAmplitude: 10,
      activePulseMin: 0.05,
      activePulseMax: 0.4,
      activeTap: 1.0,
      activeDuration: 0.26,
      restingDuration: 3,
    };

    let currentSpeed = config.restingSpeed;
    let currentAmplitude = config.restingAmplitude;
    let currentPulseMin = config.restingPulseMin;
    let currentPulseMax = config.restingPulseMax;
    let currentTap = config.restingTap;
    let targetSpeed = config.restingSpeed;
    let targetAmplitude = config.restingAmplitude;
    let targetPulseMin = config.restingPulseMin;
    let targetPulseMax = config.restingPulseMax;
    let targetTap = config.restingTap;
    let transitionDuration = config.restingDuration;

    let phase = 0;
    let rafId = 0;
    let running = true;
    let lastTime = performance.now() / 1000;

    const lerp = (current, target, duration, delta) => {
      const safeDuration = Math.max(0.001, duration);
      const alpha = 1 - Math.exp(-delta / safeDuration);
      return current + (target - current) * alpha;
    };

    const drawFrame = (delta) => {
      currentSpeed = lerp(currentSpeed, targetSpeed, transitionDuration, delta);
      currentAmplitude = lerp(currentAmplitude, targetAmplitude, transitionDuration, delta);
      currentPulseMin = lerp(currentPulseMin, targetPulseMin, transitionDuration, delta);
      currentPulseMax = lerp(currentPulseMax, targetPulseMax, transitionDuration, delta);
      currentTap = lerp(currentTap, targetTap, transitionDuration, delta);

      phase += delta * currentSpeed;
      if (phase > 1000) {
        phase %= 1000;
      }

      gl.useProgram(program);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniformLocations.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniformLocations.time, phase);
      gl.uniform1f(uniformLocations.tap, currentTap);
      gl.uniform1f(uniformLocations.speed, 1.0);
      gl.uniform1f(uniformLocations.amplitude, currentAmplitude);
      gl.uniform1f(uniformLocations.pulseMin, currentPulseMin);
      gl.uniform1f(uniformLocations.pulseMax, currentPulseMax);
      gl.uniform1f(uniformLocations.noiseType, config.noiseType);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const resize = () => {
      const rect = button.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width - 4));
      const height = Math.max(1, Math.floor(rect.height - 4));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const render = (timestamp) => {
      if (!running) return;
      const now = timestamp / 1000;
      const delta = Math.min(0.08, Math.max(0.001, now - lastTime));
      lastTime = now;
      drawFrame(delta);
      rafId = window.requestAnimationFrame(render);
    };

    const activate = () => {
      button.classList.add("is-pressed");
      targetSpeed = config.activeSpeed;
      targetAmplitude = config.activeAmplitude;
      targetPulseMin = config.activePulseMin;
      targetPulseMax = config.activePulseMax;
      targetTap = config.activeTap;
      transitionDuration = config.activeDuration;

      if (reduceMotion) {
        drawFrame(1 / 60);
      }
    };

    const deactivate = () => {
      button.classList.remove("is-pressed");
      targetSpeed = config.restingSpeed;
      targetAmplitude = config.restingAmplitude;
      targetPulseMin = config.restingPulseMin;
      targetPulseMax = config.restingPulseMax;
      targetTap = config.restingTap;
      transitionDuration = config.restingDuration;

      if (reduceMotion) {
        drawFrame(1 / 60);
      }
    };

    const onResize = () => {
      resize();
      if (reduceMotion) {
        drawFrame(1 / 60);
      }
    };

    resize();
    drawFrame(1 / 60);

    if (!reduceMotion) {
      rafId = window.requestAnimationFrame(render);
    }

    button.addEventListener("pointerdown", activate);
    button.addEventListener("pointerup", deactivate);
    button.addEventListener("pointerleave", deactivate);
    button.addEventListener("pointercancel", deactivate);
    button.addEventListener("blur", deactivate);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      running = false;
      button.classList.remove("is-pressed");
      window.cancelAnimationFrame(rafId);
      button.removeEventListener("pointerdown", activate);
      button.removeEventListener("pointerup", deactivate);
      button.removeEventListener("pointerleave", deactivate);
      button.removeEventListener("pointercancel", deactivate);
      button.removeEventListener("blur", deactivate);
      window.removeEventListener("resize", onResize);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }

  function initWelcomeGate() {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gate = createGate();
    if (!gate) {
      root.classList.remove("welcome-gate-pending");
      return;
    }

    root.classList.add("welcome-gate-open");
    document.body.style.overflow = "hidden";

    const stopCanvas = reduceMotion ? () => {} : startCanvasFlow(gate);
    const button = gate.querySelector(".welcome-gate__button");
    const stopButtonNoise = button ? startButtonNoise(button, reduceMotion) : () => {};
    let cleanupTimer = 0;
    let burningReveal = { active: false, duration: 0, stop: () => {} };
    let isEntering = false;

    const enterHome = () => {
      if (!gate || isEntering) return;
      isEntering = true;
      gate.classList.add("is-burning");

      const cleanup = () => {
        window.clearTimeout(cleanupTimer);
        burningReveal.stop();
        burningReveal = { active: false, duration: 0, stop: () => {} };
        root.classList.remove("welcome-gate-open");
        root.classList.remove("welcome-gate-pending");
        stopCanvas();
        stopButtonNoise();
        gate.remove();
        document.body.style.overflow = "";
        clearWelcomeQuery();
        isEntering = false;
      };

      if (reduceMotion) {
        cleanup();
      } else {
        burningReveal.stop();
        burningReveal = gate
          ? startBurningReveal(gate, { duration: 1220 })
          : { active: false, duration: 0, stop: () => {} };

        const cleanupDelay = burningReveal.active ? burningReveal.duration + 120 : 620;
        cleanupTimer = window.setTimeout(cleanup, cleanupDelay);
      }
    };

    if (button) {
      button.addEventListener("click", enterHome);
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "Enter") enterHome();
    });
  }

  function boot() {
    const isPending = document.documentElement.classList.contains("welcome-gate-pending");
    if (!isPending) return;
    initWelcomeGate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
