/* background.js — o fundo do espaço: #100819 (profundo) com manchas orgânicas de #111450 (iluminado). */
NEXUS.buildBackground = function () {
  const N = NEXUS;
  const texture = N.makeTexture(1024, 512, (g, w, h) => {
    g.fillStyle = '#100819'; g.fillRect(0, 0, w, h);             // 1) pinta tudo com o tom mais escuro
    for (let i = 0; i < 26; i++) {                               // 2) espalha manchas suaves do tom mais claro
      const x = N.rand(w * .12, w * .88), y = N.rand(h * .2, h * .8), r = N.rand(60, 190);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(17,20,80,.8)');
      gr.addColorStop(1, 'rgba(17,20,80,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  // Uma esfera enorme (raio 1000, além de todas as estrelas) vista POR DENTRO (BackSide) = o "céu".
  N.scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 16),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })));
};
