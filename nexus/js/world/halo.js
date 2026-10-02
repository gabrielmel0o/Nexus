/* halo.js — halo de matéria escura (inconsciente herdado de Helena).
   Estrutura invisível conforme a seção 3 do NEXUS_CONTEXT.md:
   - Não emite nem reflete luz e só se revela por efeito.
   - Uma casca gigante (raio ~170, centrada no Eu [0,0,0] e abaixo do zoom máximo de 260).
   - Partículas muito esparsas (Points, ~350 pontos) e quase invisíveis, azul-violeta escuro.
   - Só se percebem sutilmente ao afastar a câmera (zoom distante).
   - Sem PointLight, sem pickId (não clicável), sem rótulo e sem registro no LOD.
   - HALO_ATIVO liga/desliga tudo.
   - Expõe NEXUS.halo.setVisible(bool) para o modo leve (P29). */
(function () {
  // ══════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DO HALO (ajuste fino de visibilidade e presença)
  // ══════════════════════════════════════════════════════════════════
  const HALO_ATIVO       = true;    // Liga/desliga o halo de matéria escura
  const HALO_QTD         = 2000;    // Quantidade de partículas (1500 a 2500 para poeira densa)
  const HALO_TAMANHO     = 5.0;     // Tamanho dos pontos (visíveis no zoom distante de 260)
  const HALO_OPACIDADE   = 0.55;    // Opacidade perceptível sem ofuscar as estrelas
  const HALO_COR         = '#442478'; // Azul-violeta escuro profundo
  const HALO_RAIO        = 170;     // Raio médio da casca centrado no Eu [0,0,0]
  const HALO_DISPERSAO   = 12;      // Variação de espessura da casca volumétrica (158 a 182)
  // ══════════════════════════════════════════════════════════════════

  const N = NEXUS;
  N.halo = N.halo || {};

  let haloPoints = null;

  // Controle de visibilidade exposto globalmente (usado pelo modo leve / P29)
  N.halo.setVisible = function (bool) {
    if (haloPoints) {
      haloPoints.visible = !!bool;
    }
  };

  // Textura suave circular compartilhada com queda radial suave (sem cantos duros)
  let haloDotTex = null;
  function getHaloDotTexture() {
    if (haloDotTex) return haloDotTex;
    haloDotTex = N.makeTexture(32, 32, function (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(175, 130, 245, 0.9)');
      grad.addColorStop(0.35, 'rgba(105, 60, 175, 0.5)');
      grad.addColorStop(0.7, 'rgba(50, 25, 100, 0.18)');
      grad.addColorStop(1, 'rgba(16, 8, 25, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    });
    return haloDotTex;
  }

  N.buildHalo = function () {
    if (!HALO_ATIVO) {
      return null;
    }

    const rng = N.createRNG ? N.createRNG('nexus-halo-darkmatter') : Math.random;

    const positions = new Float32Array(HALO_QTD * 3);

    for (let i = 0; i < HALO_QTD; i++) {
      // Distribuição uniforme sobre a superfície esférica
      const u = rng();
      const v = rng();
      const theta = u * 2.0 * Math.PI;             // Ângulo azimutal (0 a 2pi)
      const phi = Math.acos(2.0 * v - 1.0);        // Ângulo polar (distribuição uniforme)

      // Raio com dispersão para formar uma casca difusa e volumétrica
      const r = HALO_RAIO + (rng() - 0.5) * 2.0 * HALO_DISPERSAO;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.85;          // Levemente achatada no eixo Y (formato galáctico)
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: HALO_TAMANHO,
      sizeAttenuation: true,
      map: getHaloDotTexture(),
      color: new THREE.Color(HALO_COR),
      transparent: true,
      opacity: HALO_OPACIDADE,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    haloPoints = new THREE.Points(geometry, material);
    // Centrado exatamente no Eu [0, 0, 0]
    haloPoints.position.set(0, 0, 0);

    // Sem pickId, sem iluminação própria e sem registrar no LOD
    N.scene.add(haloPoints);

    return {
      object: haloPoints,
      setVisible: N.halo.setVisible
    };
  };
})();
