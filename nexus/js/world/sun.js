/* sun.js — a estrela central: esfera de manchas + brilho suave em volta. Cores vêm dos dados do sistema. */
NEXUS.buildSun = function (system, parent) {   // parent = a "caixa" do sistema onde a estrela será colocada
  const N = NEXUS;
  const col = new THREE.Color(system.starColor);
  // Mistura a cor da estrela com branco (k = quanto clarear) e devolve texto "rgba(...)" para o desenho.
  const rgba = (k, a) => `rgba(${[col.r, col.g, col.b].map(c => Math.round((c + (1 - c) * k) * 255)).join(',')},${a})`;

  // Textura do brilho: círculo que vai de opaco (centro) a transparente (borda), na cor da estrela.
  const glowTex = N.makeTexture(128, 128, g => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, rgba(.35, 1)); r.addColorStop(.35, rgba(0, .35)); r.addColorStop(1, rgba(0, 0));
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  const glow = (size, opacity) => {                              // "sprite" = imagem que sempre olha para a câmera
    const s = new THREE.Sprite(new THREE.SpriteMaterial(
      { map: glowTex, blending: THREE.AdditiveBlending, transparent: true, opacity, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
  };
  const patch = system.starPatch || ['#ffd43b', '#ff8a1f', '#fff3a0'];   // cores das manchas
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(4, 48, 32),
    new THREE.MeshBasicMaterial({ map: N.makeTexture(512, 256, (g, w, h) => {
      g.fillStyle = system.starColor; g.fillRect(0, 0, w, h);
      N.blobs(g, w, h, patch, 40);
    }) }));
  parent.add(sun, glow(24, .95), glow(48, .4));
  return sun;
};
