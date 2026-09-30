/* utils.js — ferramentas pequenas usadas por vários arquivos.
   Aqui nasce o "NEXUS": uma caixa onde cada arquivo guarda o que oferece aos outros. */
window.NEXUS = {};

// Sorteia um número entre a e b (usado para espalhar estrelas e manchas).
NEXUS.rand = (a, b) => a + Math.random() * (b - a);

// Desenha uma imagem por código e a transforma em "textura" (a pele de um objeto 3D).
NEXUS.makeTexture = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
};

// Estrelinha de 4 pontas (branca; dá para tingir depois pela cor do material).
// É criada UMA vez só e reaproveitada: pelas estrelas do fundo (starfield.js) e pelas estrelas-conquista (elements/star.js).
NEXUS.sparkTexture = () => NEXUS._spark || (NEXUS._spark = NEXUS.makeTexture(64, 64, g => {
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 0);
  g.quadraticCurveTo(32, 32, 64, 32); g.quadraticCurveTo(32, 32, 32, 64);
  g.quadraticCurveTo(32, 32, 0, 32);  g.quadraticCurveTo(32, 32, 32, 0); g.fill();
}));

// Desenha uma mancha em forma de cápsula (o "pingo" arredondado dos planetas Kurzgesagt).
NEXUS.capsule = (g, x, y, bw, bh) => {
  const r = bh / 2;
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + bw - r, y);
  g.arc(x + bw - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(x + r, y + bh);
  g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  g.fill();
};

// Espalha n manchas coloridas numa imagem. Desenha também deslocado (x - w) para a emenda não aparecer.
NEXUS.blobs = (g, w, h, cols, n) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    const bw = NEXUS.rand(50, 150), bh = NEXUS.rand(24, 56);
    const x = NEXUS.rand(0, w), y = NEXUS.rand(h * .08, h * .85);
    NEXUS.capsule(g, x, y, bw, bh);
    NEXUS.capsule(g, x - w, y, bw, bh);
  }
};
