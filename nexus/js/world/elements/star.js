/* elements/star.js — elemento do tipo 'star' (CONQUISTA): uma estrelinha de 4 pontas, dourada,
   que orbita devagar perto do planeta e pisca suavemente. O tamanho vem de "importance".

   Este arquivo se registra em NEXUS.elementBuilders['star'].
   O planets.js lê esse mapa e chama o builder certo para cada elemento do planeta. */
(function () {
  const N = NEXUS;

  // Garante que o mapa de builders existe (outros tipos de elemento fazem o mesmo).
  N.elementBuilders = N.elementBuilders || {};

  // ====================== AJUSTES (mexa só aqui) ======================
  const TAMANHO   = { low: 1.0, medium: 1.5, high: 2.1 }; // tamanho conforme a importância
  const DISTANCIA = 2.7;   // distância do centro do planeta (em múltiplos do tamanho dele)
  const VEL_ORBITA = .2;   // velocidade de girar em volta do planeta (bem devagar)
  const VEL_PISCAR = 1.6;  // velocidade do piscar
  const COR_NUCLEO = 0xfff1b8; // centro: dourado bem claro
  const COR_BRILHO = 0xffc23d; // brilho em volta: dourado médio
  // ====================================================================

  // Transforma o id do elemento em um número fixo de 0 a 1.
  // Assim cada estrela tem posição e fase de piscar únicas, mas ESTÁVEIS entre aberturas da página.
  function semente(texto) {
    let h = 0;
    for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 100000;
    return h / 100000;
  }

  // Recebe os dados do elemento (el) e do planeta (planeta).
  // Devolve { object, update(dt) } — padrão igual para todos os tipos de elemento.
  N.elementBuilders.star = (el, planeta) => {
    const seed = semente(el.id);
    const tamanho = TAMANHO[el.importance] || TAMANHO.medium;

    // "Pivô": um eixo no centro do planeta. Girar o pivô faz a estrela (filha dele) orbitar.
    const pivo = new THREE.Group();
    pivo.rotation.x = .45;           // inclina a órbita, fica bonito e menos chapado
    pivo.rotation.y = seed * 6.283;  // ponto de partida diferente para cada estrela

    // Duas camadas sobrepostas: brilho (maior, menos opaco) e núcleo (menor, opaco).
    // Mistura aditiva = as luzes se somam → sensação de brilhar.
    const camadas = [
      [COR_BRILHO, tamanho * 1.9, .45],   // [cor, escala, opacidade]
      [COR_NUCLEO, tamanho,       1.0]
    ].map(([cor, esc, opac]) => {
      const mat = new THREE.SpriteMaterial({
        map: N.sparkTexture(),           // textura em cruz, compartilhada (vem de utils.js)
        color: cor,
        opacity: opac,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending  // soma a cor em vez de cobrir
      });
      const sprite = new THREE.Sprite(mat);   // sprite = imagem que sempre olha para a câmera
      sprite.scale.set(esc, esc, 1);
      sprite.position.x = planeta.size * DISTANCIA;  // afastada do centro do planeta
      pivo.add(sprite);
      return { sprite, mat, cor: new THREE.Color(cor), esc };
    });

    let t = 0;   // cronômetro local para o piscar

    return {
      object: pivo,   // o grupo 3D que o planets.js vai adicionar ao grupo do planeta
      update(dt) {
        t += dt;
        pivo.rotation.y += dt * VEL_ORBITA;  // orbita devagar ao redor do planeta

        // k vai de 0.5 a 1: usamos para escurecer a COR (não a opacidade, que é do LOD).
        // Escurecer em mistura aditiva = diminuir a luz → efeito de piscar suave.
        const k = .75 + .25 * Math.sin(t * VEL_PISCAR + seed * 6.283);
        camadas.forEach(c => {
          c.mat.color.copy(c.cor).multiplyScalar(k);
          const e = c.esc * (.8 + .2 * k);   // varia levemente o tamanho junto com o brilho
          c.sprite.scale.set(e, e, 1);
        });
      }
    };
  };
})();
