/* scene.js — monta o "palco": cena, câmera, renderizador (o "pintor") e a luz ambiente.
   (Cada estrela agora tem a sua própria luz, criada em system.js.) */
(function () {
  const N = NEXUS;

  N.scene = new THREE.Scene();                                   // o palco onde tudo é colocado
  N.cam = new THREE.PerspectiveCamera(38, 1, .1, 2000);          // a câmera (38° = visual de ilustração; enxerga até 2000)
  N.renderer = new THREE.WebGLRenderer({ antialias: true });     // quem desenha a cena na tela
  N.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));       // limita a qualidade para não pesar
  document.body.appendChild(N.renderer.domElement);

  N.scene.add(new THREE.AmbientLight(0x3a3a9a, .9));             // luz azulada suave (lado escuro dos planetas)

  // "Degraus" de luz: 3 faixas (escuro, médio, claro) dão o efeito de desenho, em vez de gradiente realista.
  N.toon = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.LuminanceFormat);
  N.toon.minFilter = N.toon.magFilter = THREE.NearestFilter;
  N.toon.needsUpdate = true;

  // Ajusta o tamanho quando a janela muda.
  const fit = () => {
    N.renderer.setSize(innerWidth, innerHeight);
    N.cam.aspect = innerWidth / innerHeight;
    N.cam.updateProjectionMatrix();
  };
  addEventListener('resize', fit);
  fit();
})();
