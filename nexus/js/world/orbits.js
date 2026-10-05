/* orbits.js — gerenciamento de órbitas, atenuação por distância e rastro invertido.
   Configuração central via ORBIT_FX.
*/
(function () {
  'use strict';
  var N = NEXUS;

  // ══════════════════════════════════════════════════════════════════
  // CONFIG ÚNICA (facilmente ajustável)
  // Mapeamento de categorias:
  //   - moon:   luas (aprovação, medo)
  //   - comet:  cometas (A proposta)
  //   - planet: planetas (Corpo, Carreira, Família, Estúdio de música)
  //   - major:  astros maiores (O Eu, A Criação, A Voz da Mãe, etc.)
  // ══════════════════════════════════════════════════════════════════
  var ORBIT_FX = {
    distance: {
      // distâncias da câmera ao ASTRO (posição mundial do corpo).
      // fadeStart: opacidade máxima começa a cair.
      // fadeEnd: opacidade atinge 0.
      moon:   { fadeStart: 40,  fadeEnd: 90 },
      comet:  { fadeStart: 40,  fadeEnd: 90 },
      planet: { fadeStart: 120, fadeEnd: 260 },
      major:  { fadeStart: 300, fadeEnd: 700 }
    },
    labelDistance: {
      moon:   { fadeStart: 40,  fadeEnd: 90 },
      comet:  { fadeStart: 40,  fadeEnd: 90 },
      planet: { fadeStart: 120, fadeEnd: 260 },
      major:  { fadeStart: 300, fadeEnd: 700 }
    },
    maxOpacity: 0.55,        // opacidade normal da órbita
    trail: {
      length: 0.35,          // fração da volta (0 a 1) em que o rastro recupera a opacidade
      minFactor: 0.0,        // opacidade do rastro no ponto imediatamente atrás do astro (0 = 0%)
      curve: 'smoothstep'    // 'linear' | 'smoothstep'
    }
  };

  N.ORBIT_FX = ORBIT_FX;

  // Função utilitária smoothstep
  function smoothstep(min, max, value) {
    var x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  N.orbitSmoothstep = smoothstep;

  // Atenuação de opacidade por distância para órbitas
  N.getOrbitDistFactor = function (bodyWorldPos, category) {
    if (!N.cam) return 1.0;
    var d = N.cam.position.distanceTo(bodyWorldPos);
    var cfg = (ORBIT_FX.distance && ORBIT_FX.distance[category]) || ORBIT_FX.distance.planet;
    return 1.0 - smoothstep(cfg.fadeStart, cfg.fadeEnd, d);
  };

  // Atenuação de opacidade por distância para rótulos
  N.getLabelDistFactor = function (bodyWorldPos, category) {
    if (!N.cam) return 1.0;
    var d = N.cam.position.distanceTo(bodyWorldPos);
    var cfg = (ORBIT_FX.labelDistance && ORBIT_FX.labelDistance[category]) || ORBIT_FX.labelDistance.planet;
    return 1.0 - smoothstep(cfg.fadeStart, cfg.fadeEnd, d);
  };

  // ══════════════════════════════════════════════════════════════════
  // SHADER MATERIAL PARA RASTRO INVERTIDO (Efeito 2)
  // ══════════════════════════════════════════════════════════════════
  var OrbitShader = {
    vertexShader: [
      'attribute float aPhase;',
      'varying float vPhase;',
      'void main() {',
      '  vPhase = aPhase;',
      '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
      '  gl_Position = projectionMatrix * mvPosition;',
      '}'
    ].join('\n'),

    fragmentShader: [
      'uniform vec3 uColor;',
      'uniform float uMaxOpacity;',
      'uniform float uBodyPhase;',
      'uniform float uTrailLength;',
      'uniform float uTrailMin;',
      'uniform int uCurveMode;',
      'uniform float uDir;',
      'varying float vPhase;',
      'void main() {',
      '  // ahead = 0 no astro, cresce para a frente no sentido do movimento',
      '  float ahead = (uDir > 0.0) ? mod(vPhase - uBodyPhase + 1.0, 1.0) : mod(uBodyPhase - vPhase + 1.0, 1.0);',
      '  float k = clamp(ahead / max(uTrailLength, 0.0001), 0.0, 1.0);',
      '  if (uCurveMode == 1) {',
      '    k = k * k * (3.0 - 2.0 * k);',
      '  }',
      '  float trailFactor = mix(uTrailMin, 1.0, k);',
      '  // Suavização do salto exatamente sob o astro (janela de 0.5% da volta)',
      '  if (ahead > 0.995) {',
      '    float wrapSmooth = (ahead - 0.995) / 0.005;',
      '    trailFactor = mix(trailFactor, 1.0, wrapSmooth);',
      '  }',
      '  float alpha = uMaxOpacity * trailFactor;',
      '  if (alpha <= 0.0005) discard;',
      '  gl_FragColor = vec4(uColor, alpha);',
      '}'
    ].join('\n')
  };

  // Adiciona o atributo 'aPhase' (0 a 1) na geometria da linha de órbita
  N.prepareOrbitGeometry = function (geometry) {
    if (geometry.attributes.aPhase) return geometry;
    var count = geometry.attributes.position.count;
    var phases = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      phases[i] = i / (count - 1);
    }
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return geometry;
  };

  // Cria o ShaderMaterial para a linha de órbita
  N.createOrbitMaterial = function (colorHex) {
    var color = new THREE.Color(colorHex !== undefined ? colorHex : 0x8a8fe8);
    var isSmooth = ORBIT_FX.trail.curve === 'smoothstep';

    return new THREE.ShaderMaterial({
      uniforms: {
        uColor:       { value: color },
        uMaxOpacity:  { value: ORBIT_FX.maxOpacity },
        uBodyPhase:   { value: 0.0 },
        uTrailLength: { value: ORBIT_FX.trail.length },
        uTrailMin:    { value: ORBIT_FX.trail.minFactor },
        uCurveMode:   { value: isSmooth ? 1 : 0 },
        uDir:         { value: 1.0 }
      },
      vertexShader: OrbitShader.vertexShader,
      fragmentShader: OrbitShader.fragmentShader,
      transparent: true,
      depthWrite: false
    });
  };

  // Lista global de órbitas registradas para atualização por frame
  N.registeredOrbits = [];
  // Fator global usado pela tela de Start para esconder/mostrar as órbitas sem brigar com o loop
  N.orbitStartFade = (N.orbitStartFade === undefined) ? 1.0 : N.orbitStartFade;

  N.registerOrbit = function (config) {
    // config: { line, category, getBodyPos, getPhase, baseOpacity }
    if (!config || !config.line) return;
    N.prepareOrbitGeometry(config.line.geometry);
    N.registeredOrbits.push(config);
  };

  // Atualização a cada frame: visibilidade por distância e rastro invertido
  N.updateOrbitsFX = function () {
    var startFade = (typeof N.orbitStartFade === 'number') ? Math.max(0, Math.min(1, N.orbitStartFade)) : 1.0;

    for (var i = 0; i < N.registeredOrbits.length; i++) {
      var item = N.registeredOrbits[i];
      var line = item.line;
      var category = item.category || 'planet';

      var bodyPos = item.getBodyPos ? item.getBodyPos() : null;
      if (!bodyPos) continue;

      var distFactor = N.getOrbitDistFactor(bodyPos, category);

      if (distFactor <= 0.0001 || startFade <= 0.0001) {
        line.visible = false;
        continue;
      }

      line.visible = true;
      var baseOpacity = item.baseOpacity !== undefined ? item.baseOpacity : ORBIT_FX.maxOpacity;
      var orbitMaxOpacity = baseOpacity * distFactor * startFade;

      var phase = item.getPhase ? item.getPhase() : 0.0;
      var bodyPhase = (phase % 1.0 + 1.0) % 1.0;
      var dir = (typeof item.getDir === 'function') ? item.getDir() : (item.dir !== undefined ? item.dir : 1.0);

      var mat = line.material;
      if (mat && mat.uniforms) {
        mat.uniforms.uMaxOpacity.value = orbitMaxOpacity;
        mat.uniforms.uBodyPhase.value = bodyPhase;
        mat.uniforms.uTrailLength.value = ORBIT_FX.trail.length;
        mat.uniforms.uTrailMin.value = ORBIT_FX.trail.minFactor;
        mat.uniforms.uCurveMode.value = (ORBIT_FX.trail.curve === 'smoothstep') ? 1 : 0;
        mat.uniforms.uDir.value = dir;
      }
    }
  };

})();
