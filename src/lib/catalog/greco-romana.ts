/**
 * Catálogo — Grécia e Roma.
 *
 * Narrativas que formam o repertório clássico ocidental e que o Oráculo usa
 * como referência de estrutura, arquétipo e motivo.
 */
import type { CatalogEntry } from "@/lib/oracle-types";

export const CATALOG_GREGO_ROMANA: CatalogEntry[] = [
  {
    id: "teseu",
    name: "Teseu",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Plutarco; cerâmica ática, séc. VI a.C.)",
    synopsis:
      "Filho de Egeu e de uma princesa de Trezena, Teseu cresce longe do pai e viaja a Atenas abrindo caminho pela força. Ao saber do tributo de sete jovens e sete donzelas enviados a Creta, oferece-se no lugar de um deles e entra no labirinto para matar o Minotauro. Ariadne, apaixonada, entrega-lhe o fio que garante o retorno — e é abandonada em Naxos.",
    motifs: ["labirinto", "monstro a ser morto", "jornada do herói", "travessia da água", "traição"],
    archetypes: ["Herói", "Guardião do Limiar", "Sombra"],
    themes: ["coragem cívica contra o tributo", "memória como fio de retorno", "o preço do abandono"],
    characters: ["Teseu", "Ariadne", "Minotauro", "Egeu", "Minos", "Dédalo"],
  },
  {
    id: "jasao",
    name: "Jasão",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Apollonius de Rodes, séc. III a.C.)",
    synopsis:
      "Jasão reivindica o trono de Iolcos usurpado por Pelias e recebe uma tarefa que deveria ser impossível: trazer o Velho Velocino de Ouro da Cólquida. Com os Argonautas e a ajuda de Medeia, atravessa mares, vence touros de bronze e um dragão — para descobrir que o prêmio não devolve o que prometia.",
    motifs: ["missão impossível", "objeto mágico", "jornada do herói", "travessia da água", "auxílio divino"],
    archetypes: ["Herói", "Mentor", "Traidor"],
    themes: ["promessa e dívida", "o preço do auxílio", "ambição sem pertencimento"],
    characters: ["Jasão", "Medeia", "Pelias", "Eetes", "Hera", "Orfeu"],
  },
  {
    id: "aquiles",
    name: "Aquiles",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Homero, séc. VIII a.C.)",
    synopsis:
      "O melhor dos guerreiros aqueus sabe que morrerá jovem em Troia. Retira-se da batalha por uma ofensa à sua honra e só retorna para vingar Pátroclo, matando Heitor e arrastando o corpo pela poeira. O relato termina antes da queda de Troia, no gesto de Príamo que beija as mãos do assassino do filho.",
    motifs: ["fúria guerreira", "honra ferida", "mortalidade", "duelo com a morte", "vingança"],
    archetypes: ["Herói Trágico", "Sombra", "Rei Sagrado"],
    themes: ["glória e brevidade da vida", "ira como destino", "piedade para além da vingança"],
    characters: ["Aquiles", "Pátroclo", "Heitor", "Príamo", "Agamenon", "Tétis"],
  },
  {
    id: "medeia",
    name: "Medeia",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Eurípides, 431 a.C.)",
    synopsis:
      "Feiticeira da Cólquida, Medeia trai a família para salvar Jasão e é levada à Grécia como estrangeira. Abandonada por ele, que negocia outro casamento, executa uma vingança calculada que atinge o próprio sangue. A peça termina com ela em fuga, não punida — o que escandalizou Atenas.",
    motifs: ["traição", "vingança", "amor e morte", "exílio", "sacrifício materno", "ciúme"],
    archetypes: ["Trickster", "Sombra", "Anima/Animus"],
    themes: ["estrangeiro sem direitos", "paixão que se converte em cálculo", "justiça impossível"],
    characters: ["Medeia", "Jasão", "Creonte", "Glauce", "Egeu", "Os filhos"],
  },
  {
    id: "antigona",
    name: "Antígona",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Sófocles, 441 a.C.)",
    synopsis:
      "Depois da guerra fratricida, Creonte proíbe o sepultamento de Polinices. Antígona cumpre o rito em nome das leis não escritas e é condenada à morte viva numa caverna. A cidade descobre tarde demais que a ordem do soberano não esgota a justiça.",
    motifs: ["lei e transgressão", "justiça", "irmãos rivais", "martírio", "morte"],
    archetypes: ["Herói Trágico", "Mártir", "Governante"],
    themes: ["lei do Estado contra lei da família", "obediência e consciência", "o preço da teimosia justa"],
    characters: ["Antígona", "Creonte", "Ismene", "Polinices", "Hémon", "Tirésias"],
  },
  {
    id: "icaro-dedalo",
    name: "Ícaro e Dédalo",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Ovídio, Metamorfoses)",
    synopsis:
      "Presos no labirinto que ele mesmo construiu, Dédalo fabrica asas de cera e pena para fugir com o filho. O pai avisa: nem perto do sol, nem perto do mar. Ícaro sobe, a cera derrete e ele cai. Dédalo sobrevive para enterrar o filho e amaldiçoar a própria arte.",
    motifs: ["hybris", "tecnologia", "queda e redenção", "labirinto", "perda e luto"],
    archetypes: ["Artista", "Herói Trágico", "Mentor"],
    themes: ["o limite da técnica", "juventude e imprudência", "criação que volta contra o criador"],
    characters: ["Ícaro", "Dédalo", "Minos", "Pasífae"],
  },
  {
    id: "sisifo",
    name: "Sísifo",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Homero; Camus, 1942)",
    synopsis:
      "Sísifo engana a morte duas vezes e ainda tenta subornar Perséfone. Condenado, empurra uma pedra até o topo de uma colina que sempre rolou de volta. A narrativa é mínima e por isso mesmo universal: trabalho sem fim e a pergunta sobre o sentido de continuar.",
    motifs: ["punição divina", "mortalidade", "trapaça", "provação", "escolha", "carga impossível"],
    archetypes: ["Trickster", "Herói Trágico", "Fora-da-lei"],
    themes: ["absurdo e revolta", "dignidade no castigo", "astúcia contra o destino"],
    characters: ["Sísifo", "Hades", "Perséfone", "Zeus", "Tântalo"],
  },
  {
    id: "persefone",
    name: "Perséfone",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Hino Homérico a Deméter, séc. VII a.C.)",
    synopsis:
      "Raptada por Hades enquanto colhia flores, Perséfone se torna rainha do mundo dos mortos. Deméter suspende as colheitas até conseguir o retorno da filha — mas as sementes de romã já a ligaram ao submundo. O mito explica as estações e a impossibilidade de voltar intacto.",
    motifs: ["descida ao submundo", "morte e renascimento", "ciclo da vida", "seca e chuva", "sacrifício materno"],
    archetypes: ["Anima/Animus", "Grande Mãe", "Rainha"],
    themes: ["luto e fertilidade", "consentimento e violência", "metade pertencente aos mortos"],
    characters: ["Perséfone", "Deméter", "Hades", "Zeus", "Hécate"],
  },
  {
    id: "cupido-e-psique",
    name: "Cupido e Psique",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Apuleio, O Asno de Ouro, séc. II)",
    synopsis:
      "Psique, mortal de beleza comparada a Afrodite, é entregue a um marido invisível. Incentivada pelas irmãs, acende a lâmpada e descobre Eros — que foge ferido. Para reencontrá-lo, ela cumpre tarefas impossíveis impostas pela deusa e desce ao mundo dos mortos antes de ser divinizada.",
    motifs: ["amor proibido", "proibição", "missão impossível", "descida ao submundo", "confiança"],
    archetypes: ["Anima/Animus", "Herói", "Grande Mãe"],
    themes: ["confiança contra curiosidade", "amor que exige provas", "alma em processo de individuação"],
    characters: ["Psique", "Eros", "Afrodite", "As irmãs", "Zeus"],
  },
  {
    id: "pandora",
    name: "Pandora",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Hesíodo, Teogonia)",
    synopsis:
      "Criada por ordem de Zeus como castigo à humanidade que recebeu o fogo de Prometeu, Pandora recebe uma jarra que não deve abrir. Abre. Do recipiente escapam as doenças e os sofrimentos; no fundo resta a esperança — a única coisa que não fugiu.",
    motifs: ["proibição", "criação da humanidade", "punição divina", "maldição", "escolha"],
    archetypes: ["Anima/Animus", "Trickster", "Mártir"],
    themes: ["curiosidade como origem do mal", "esperança residual", "culpa feminina construída"],
    characters: ["Pandora", "Zeus", "Prometeu", "Epimeteu", "Hefesto"],
  },
  {
    id: "eneias",
    name: "Eneias",
    type: "mito",
    origin: "Mitologia Romana",
    period: "Antiguidade Clássica (Virgílio, Eneida, 29–19 a.C.)",
    synopsis:
      "Sobrevivente de Troia, Eneias carrega o pai nos ombros e o filho pela mão para fora da cidade em chamas. Erra pelo Mediterrâneo, desce ao mundo dos mortos para ouvir a profecia de Roma e abandona Dido em Cartago porque a fundação exige o sacrifício do amor.",
    motifs: ["jornada do herói", "exílio", "fundação de cidade", "descida ao submundo", "sacrifício"],
    archetypes: ["Herói", "Rei Sagrado", "Anima/Animus"],
    themes: ["dever acima do desejo", "pátria como herança", "o custo humano do império"],
    characters: ["Eneias", "Anquises", "Ascanio", "Dido", "Turno"],
  },
  {
    id: "romulo-e-remo",
    name: "Rômulo e Remo",
    type: "mito",
    origin: "Mitologia Romana",
    period: "Antiguidade Clássica (Tito Lívio, Ab Urbe Condita)",
    synopsis:
      "Filhos de Marte e da vestal Reia Sílvia, os gêmeos são condenados ao rio e amamentados por uma loba. Criados por pastores, fundam uma cidade no local onde foram salvos — mas discutem sobre o muro e o augúrio. Rômulo mata Remo e dá nome a Roma.",
    motifs: ["nascimento miraculoso", "fundação de cidade", "irmãos rivais", "fratricídio", "aliados animais", "gemelaridade"],
    archetypes: ["Herói", "Sombra", "Governante"],
    themes: ["fundação como crime original", "destino e violência fraterna", "mito que legitima poder"],
    characters: ["Rômulo", "Remo", "Reia Sílvia", "Marte", "Fáustulo", "A loba"],
  },
];
