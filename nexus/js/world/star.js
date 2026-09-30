/* star.js — elemento do tipo 'star' (CONQUISTA): uma estrelinha de 4 pontas, dourada,
   que orbita devagar perto do planeta e pisca suavemente. O tamanho vem de "importance". */
(function () {
  const N = NEXUS;
  N.elementBuilders = N.elementBuilders || {};

  // ====================== AJUSTES ======================
  const TAMANHO = { low: 1.0, medium: 1.5, high: 2.1 };  // tamanho da estrela conforme a importância
  const DISTANCIA = 2.7;       // distância do centro do planeta = tamanho do planeta x este número
  const VEL_ORBITA = .2;       // velocidade de girar em volta do planeta (bem devagar)
  const VEL_PISCAR = 1.6;      // velocidade do piscar
  const COR_NUCLEO = 0xfff1b8; // centro: dourado bem claro
  const COR_BRILHO = 0xffc23d; // brilho em volta: dourado
  // =====================================================

  // Transforma o id do elemento em um número de 0 a 1. Assim a posição inicial e o piscar
  // de cada estrela são diferentes entre si, mas NÃO mudam a cada vez que a página abre.
  function semente(texto) {
    let h = 0;
    for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 100000;
    return h / 100000;
  }

  // Recebe os dados do elemento (el) e do planeta (planeta). Devolve { object, update(dt) }.
  N.elementBuilders.star = (el, planeta) => {
    const seed = semente(el.id);
    const tamanho = TAMANHO[el.importance] || TAMANHO.medium;

    // "Pivô": um eixo no centro do planeta. Girar o pivô faz a estrela (filha dele) orbitar.
    const pivo = new THREE.Group();
    pivo.rotation.x = .45;                 // inclina a órbita, para não ficar chapada
    pivo.rotation.y = seed * 6.283;        // ponto de partida na órbita

    // Duas camadas da mesma estrelinha: o núcleo (claro, pequeno) e o brilho (dourado, maior e mais fraco).
    // Mistura "aditiva" = as luzes se somam, o que dá a sensação de brilhar.
    const camadas = [[COR_BRILHO, tamanho * 1.9, .45], [COR_NUCLEO, tamanho, 1]].map(([cor, esc, opac]) => {
      const mat = new THREE.SpriteMaterial({
        map: N.sparkTexture(), color: cor, opacity: opac,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(mat);            // sprite = imagem que sempre olha para a câmera
      sprite.scale.set(esc, esc, 1);
      sprite.position.x = planeta.size * DISTANCIA;    // afastada do centro do planeta
      pivo.add(sprite);
      return { sprite, mat, cor: new THREE.Color(cor), esc };
    });

    let t = 0;
    return {
      object: pivo,
      update(dt) {
        t += dt;
        pivo.rotation.y += dt * VEL_ORBITA;
        // k vai e volta entre 0.5 e 1. Piscamos mexendo na COR (mais escura = mais fraca, por causa da
        // mistura aditiva) e num leve tamanho. Não mexemos na opacidade: ela é controlada pelo LOD (lod.js).
        const k = .75 + .25 * Math.sin(t * VEL_PISCAR + seed * 6.283);
        camadas.forEach(c => {
          c.mat.color.copy(c.cor).multiplyScalar(k);
          const e = c.esc * (.8 + .2 * k);
          c.sprite.scale.set(e, e, 1);
        });
      }
    };
  };
})();
