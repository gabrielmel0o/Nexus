/* labels.js — os nomes flutuantes ao lado dos planetas (texto HTML posicionado sobre o 3D). */
(function () {
  const N = NEXUS, v = new THREE.Vector3();

  N.createLabel = text => {
    const el = document.createElement('div');
    el.className = 'lb'; el.textContent = text;
    document.body.appendChild(el);
    return el;
  };

  // obj = o grupo 3D do planeta. Converte a posição dele no universo em posição na tela e move o texto até lá.
  // alpha = de 0 a 1, vem do LOD (lod.js): quanto o nome deve aparecer conforme a distância da câmera.
  N.updateLabel = (el, obj, size, alpha = 1) => {
    obj.getWorldPosition(v);                                     // onde o planeta está no universo (já conta a caixa do sistema)
    v.project(N.cam);
    const x = (v.x * .5 + .5) * innerWidth;
    const y = (-v.y * .5 + .5) * innerHeight + 16 + size * 7;
    el.style.transform = `translate(${x}px,${y}px) translate(-50%,0)`;
    el.style.opacity = v.z < 1 ? .9 * alpha : 0;                 // atrás da câmera = escondido
  };
})();
