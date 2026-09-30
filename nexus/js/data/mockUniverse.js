/* mockUniverse.js — os DADOS do universo (fictícios por enquanto).
   ESTE é o único arquivo que o backend vai substituir no futuro.
   Nenhum outro arquivo deve ter planetas "escritos à mão".

   Formato:  Universo → Sistemas → Planetas → Elementos
   - today:      o "hoje" virtual (não é a data real do computador). Será usado para contar dias até eventos.
   - systems:    lista de sistemas. Cada um tem uma estrela e seus planetas.
       position:   onde o sistema fica no universo [x, y, z]
       starColor:  cor da estrela (e do brilho e da luz dela)
       starPatch:  3 cores das manchas da estrela
   - elements:   o que existe em volta de cada planeta. Por enquanto só o tipo 'star' tem visual.
       Cada elemento futuro terá:
       { id, type: 'star'|'asteroid'|'satellite'|'blackhole', title,
         date (opcional, formato 'AAAA-MM-DD'),
         importance: 'low'|'medium'|'high',
         status: 'active'|'growing'|'resolved' } */
NEXUS.data = {
  today: '2026-09-30',
  systems: [
    {
      id: 'sys-estudos-trabalho',
      name: 'Estudos e trabalho',
      position: [0, 0, 0],
      starColor: '#ffb020',
      starPatch: ['#ffd43b', '#ff8a1f', '#fff3a0'],
      planets: [
        // name: nome · base/patch: cores · size: tamanho · orbit: distância da estrela · speed: velocidade
        { id: 'p1', name: 'Faculdade', base: '#3b5bdb', patch: ['#9b8be0', '#2f8f83', '#8ee0a8'], size: 1.5, orbit: 9,  speed: .11,
          elements: [{ id: 'e1', type: 'star', title: 'Nota máxima', importance: 'high', status: 'resolved' }] },
        { id: 'p2', name: 'Trabalho',  base: '#e8590c', patch: ['#ffd43b', '#c2255c', '#f76707'], size: 1.9, orbit: 14, speed: .075, rings: '#ffd8a8', elements: [] },
        { id: 'p5', name: 'Projetos',  base: '#82c91e', patch: ['#d8f5a2', '#2b8a3e', '#c0eb75'], size: 1.4, orbit: 19, speed: .055,
          elements: [{ id: 'e2', type: 'star', title: 'Projeto concluído', importance: 'medium', status: 'resolved' }] }
      ]
    },
    {
      id: 'sys-corpo-mente',
      name: 'Corpo e mente',
      position: [95, 8, -45],
      starColor: '#ff6b6b',
      starPatch: ['#ffa8a8', '#e03131', '#ffe3e3'],
      planets: [
        { id: 'p3', name: 'Saúde',   base: '#12b886', patch: ['#96f2d7', '#0b7285', '#b2f2bb'], size: 1.3, orbit: 10, speed: .09,  moon: true, elements: [] },
        { id: 'p4', name: 'Hobbies', base: '#be4bdb', patch: ['#f783ac', '#7048e8', '#ffa8a8'], size: 1.6, orbit: 16, speed: .06,  elements: [] }
      ]
    },
    {
      id: 'sys-pessoas',
      name: 'Pessoas',
      position: [-85, -6, 60],
      starColor: '#74c0fc',
      starPatch: ['#d0ebff', '#339af0', '#a5d8ff'],
      planets: [
        { id: 'p6', name: 'Relacionamentos', base: '#f06595', patch: ['#ffdeeb', '#a61e4d', '#fcc2d7'], size: 1.5, orbit: 10, speed: .08,  elements: [] },
        { id: 'p7', name: 'Família',         base: '#fcc419', patch: ['#fff3bf', '#e67700', '#ffe066'], size: 1.7, orbit: 16, speed: .055, rings: '#fff3bf', elements: [] }
      ]
    }
  ]
};

// Ponto ÚNICO de acesso aos dados. Depois, só esta linha passa a buscar do backend.
NEXUS.getUniverse = () => NEXUS.data;
