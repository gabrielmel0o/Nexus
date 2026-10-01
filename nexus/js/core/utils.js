/* utils.js — ferramentas pequenas usadas por vários arquivos.
   Aqui nasce o "NEXUS": uma caixa onde cada arquivo guarda o que oferece aos outros. */
window.NEXUS = {};

// Sorteia um número entre a e b (usado para espalhar estrelas e elementos aleatórios).
NEXUS.rand = (a, b) => a + Math.random() * (b - a);

// Gerador pseudo-aleatório baseado em texto (semente por id).
// Garante que planetas e sistemas abram sempre com o mesmo desenho e ângulos.
NEXUS.createRNG = (seedStr) => {
  let h = 2166136261 >>> 0;
  const str = String(seedStr || 'nexus');
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Sorteia com RNG customizado entre a e b
NEXUS.randSeeded = (rng, a, b) => a + rng() * (b - a);

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

// Espalha n manchas coloridas numa imagem.
// Aceita um gerador rng opcional para reprodutibilidade.
NEXUS.blobs = (g, w, h, cols, n, rng) => {
  const randomFn = rng ? () => rng() : Math.random;
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    const bw = 50 + randomFn() * 100;
    const bh = 24 + randomFn() * 32;
    const x = randomFn() * w;
    const y = (h * .08) + randomFn() * (h * .77);
    NEXUS.capsule(g, x, y, bw, bh);
    NEXUS.capsule(g, x - w, y, bw, bh);
  }
};
