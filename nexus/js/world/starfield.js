/* starfield.js — estrelas de brilho em cruz, em 3 camadas de distância (é isso que cria o parallax).
   As camadas ficam LONGE (a partir de 280), além do zoom máximo da câmera (260) e dos sistemas. */
NEXUS.buildStarfield = function () {
  const N = NEXUS;
  // A estrelinha de 4 pontas agora vem de utils.js (NEXUS.sparkTexture), para ser compartilhada.
  const spark = N.sparkTexture();
  // [quantidade, tamanho, distância mínima, distância máxima, cor]
  // (o tamanho cresce junto com a distância, para as estrelas parecerem do mesmo tamanho de antes)
  [[900, 3.0, 300, 800, '#ffffff'], [450, 5.0, 290, 600, '#a9c1ff'], [120, 7.8, 280, 450, '#ffd8a8']]
    .forEach(([n, size, r0, r1, color]) => {
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {                              // sorteia um ponto em volta de tudo
        const d = N.rand(r0, r1), th = N.rand(0, 6.283), ph = Math.acos(N.rand(-1, 1));
        pos.set([d * Math.sin(ph) * Math.cos(th), d * Math.cos(ph), d * Math.sin(ph) * Math.sin(th)], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      N.scene.add(new THREE.Points(geo, new THREE.PointsMaterial(
        { size, map: spark, color, transparent: true, alphaTest: .05, depthWrite: false })));
    });
};
