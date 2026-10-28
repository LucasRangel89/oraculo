/**
 * Dossiês de referência (ground truth curado).
 *
 * Conteúdo extraído dos documentos legados do projeto e convertido para o
 * contrato `AnalysisResult`:
 *
 *  - `Relatório de Análise Completa: A Trilogia "O Senhor dos Anéis"`
 *    → dossiê de Frodo Bolseiro / O Senhor dos Anéis (6 lentes completas)
 *  - blueprints "Explorador Mitológico Universal" e "Análise de Narrativas
 *    Mitológicas e Culturais" → dossiês de Perseu, Prometeu e Édipo
 *    (exemplos canônicos usados nos próprios documentos)
 *
 * Esses dossiês alimentam:
 *  1. o motor local (`local-analysis.ts`) — profundidade real sem LLM;
 *  2. a aba "Acervo" — estudo de caso navegável;
 *  3. o modo de avaliação/QA — respostas de referência para comparar agentes.
 *
 * Regra editorial: nada aqui é apresentado como verdade crítica; são leituras
 * interpretativas fundamentadas nas fontes citadas.
 */
import type {
  ArchetypeAnalysis,
  CulturalAnalysis,
  NarrativeFacts,
  PsychoanalysisData,
  StructureAnalysis,
  SymbolAnalysis,
  ThematicAnalysis,
} from "@/lib/oracle-types";
import { normalizeText } from "@/lib/similarity";

export interface ReferenceDossier {
  /** id estável (usado em links do Acervo) */
  id: string;
  /** nome canônico do dossiê */
  title: string;
  /** apelidos aceitos na busca */
  aliases: string[];
  /** documento de origem no acervo legado */
  provenance: string;
  facts: NarrativeFacts;
  structure: StructureAnalysis;
  archetypes: ArchetypeAnalysis;
  symbols: SymbolAnalysis;
  themes: ThematicAnalysis;
  psychoanalysis: PsychoanalysisData;
  cultural: CulturalAnalysis;
}

const STAGES = [
  "Mundo Comum",
  "Chamado à Aventura",
  "Recusa do Chamado",
  "Encontro com o Mentor",
  "Travessia do Primeiro Limiar",
  "Testes, Aliados e Inimigos",
  "Aproximação da Caverna Oculta",
  "Provação",
  "Recompensa",
  "Caminho de Volta",
  "Ressurreição",
  "Retorno com Elixir",
] as const;

type StageName = (typeof STAGES)[number];

/** Monta os 12 estágios preenchendo ausentes de forma explícita. */
function journey(
  present: Partial<Record<StageName, string>>
): { stage: string; present: boolean; evidence: string }[] {
  return STAGES.map((stage) => {
    const evidence = present[stage];
    return {
      stage,
      present: Boolean(evidence),
      evidence:
        evidence ??
        "Estágio ausente: a narrativa não o dramatiza, o que reduz o didatismo do monomito e desloca a transformação para outras camadas.",
    };
  });
}

// ---------------------------------------------------------------------------
// O Senhor dos Anéis (dossiê completo a partir do relatório legado)
// ---------------------------------------------------------------------------

const LOTR: ReferenceDossier = {
  id: "senhor-dos-aneis",
  title: "O Senhor dos Anéis",
  aliases: [
    "o senhor dos aneis",
    "senhor dos aneis",
    "frodo",
    "frodo bolseiro",
    "lotr",
    "tolkien",
    "a sociedade do anel",
  ],
  provenance:
    "Relatório de Análise Completa: A Trilogia “O Senhor dos Anéis” (documento legado) — seções 1 a 6 convertidas nas lentes do Oráculo.",
  facts: {
    name: "O Senhor dos Anéis (Frodo Bolseiro)",
    type: "livro",
    origin: "Literatura (J.R.R. Tolkien)",
    period: "1954–1955",
    characters: ["Frodo", "Samwise", "Gandalf", "Aragorn", "Gollum", "Sauron"],
    synopsis:
      "O hobbit Frodo herda o Anel Único, forjado por Sauron e capaz de corromper qualquer portador. Com Gandalf, Aragorn e a Sociedade do Anel, parte rumo a Mordor para destruí-lo na Montanha da Perdição. No fim, o Anel vence a vontade de Frodo — e só a piedade acumulada no caminho, materializada em Gollum, salva a missão.",
    found: true,
    variants: [],
  },
  structure: {
    summary:
      "A trilogia opera em dois níveis: uma macroestrutura clássica de três atos que coincide com os três volumes e microestruturas internas em cada um. A demanda é linear (destruir o Anel), mas se complexifica ao se dividir em linhas narrativas paralelas que convergem no desfecho. A coesão espacial — mapas, geografia, cronologia dos Apêndices — sustenta a verossimilhança do mundo.",
    acts: 3,
    beats: [
      "mundo_comum",
      "chamado_a_aventura",
      "conselho_de_elrond",
      "travessia_do_limiar",
      "queda_do_mentor",
      "rompimento_da_sociedade",
      "provacao",
      "falha_do_heroi",
      "eucatastrofe",
      "retorno_agridoce",
    ],
    incitingIncident:
      "Gandalf revela a verdadeira natureza do Anel e a ameaça de Sauron; a descoberta transforma o objeto herdado em fardo cósmico.",
    climax:
      "Duas frentes simultâneas: a Batalha dos Campos de Pelennor diante de Minas Tirith e o confronto final de Frodo com o Anel na Montanha da Perdição.",
    resolution:
      "O Anel é destruído com a intervenção involuntária de Gollum; Sauron cai, Aragorn é coroado e a paz retorna. O epílogo prolongado (Portos Cinzentos e Purificação do Condado) expõe o custo: os heróis não voltam inteiros.",
    tone: "épico-elegíaco",
    heroJourney: journey({
      "Mundo Comum": "O Condado pacífico, a rotina dos hobbits e o aniversário de Bilbo.",
      "Chamado à Aventura": "Gandalf revela a natureza do Anel e a ameaça de Sauron.",
      "Recusa do Chamado":
        "O medo de Frodo e o desejo de que o Anel nunca tivesse chegado até ele.",
      "Encontro com o Mentor":
        "Gandalf orienta, e o Conselho de Elrond define a missão e forma a Sociedade.",
      "Travessia do Primeiro Limiar":
        "A saída do Condado rumo ao mundo desconhecido; o limite entre o familiar e o perigoso.",
      "Testes, Aliados e Inimigos":
        "Espectros do Anel, Caradhras, Moria, Lórien, Boromir — aliados e tentações se misturam.",
      "Aproximação da Caverna Oculta":
        "A descida a Moria e o covil de Laracna: o ponto mais fundo e escuro da jornada.",
      "Provação":
        "A queda de Gandalf no abismo de Moria e, depois, o peso quase insuportável do Anel em Frodo.",
      Recompensa:
        "A destruição do Anel — conquistada não por força, mas por perseverança, lealdade e piedade.",
      "Caminho de Volta":
        "O retorno ao Condado, agora marcado pela guerra e pela necessidade de purificação.",
      Ressurreição:
        "A coroação de Aragorn como Rei Elessar e a cura de Frodo em Minas Tirith — renascimento coletivo e pessoal.",
      "Retorno com Elixir":
        "A partida nos Portos Cinzentos: Frodo retorna mestre de dois mundos, mas curado de nenhum.",
    }),
    confidence: 0.92,
  },
  archetypes: {
    summary:
      "O quadro arquetípico é coral: Frodo encarna o herói sacrificial, Sam o companheiro leal que sustenta a jornada, Gandalf o mentor que morre e retorna, Aragorn o rei oculto que assume o trono, Gollum a sombra ambivalente e Sauron a sombra coletiva — um mal onipresente que quase não tem corpo.",
    archetypes: [
      {
        character: "Frodo",
        archetype: "Herói",
        description:
          "Portador do Anel: objetivo consciente é destruir o Anel; o inconsciente é livrar-se de um fardo que o excede. Seu arco é de perda, não de ganho.",
      },
      {
        character: "Samwise",
        archetype: "Companheiro Leal",
        description:
          "Âncora emocional de Frodo e \"verdadeiro herói\" para muitos leitores: evolui de jardineiro a guerreiro pela força de caráter.",
      },
      {
        character: "Gandalf",
        archetype: "Mentor",
        description:
          "Velho Sábio que guia, morre e retorna transformado; sua ausência força o amadurecimento dos demais.",
      },
      {
        character: "Aragorn",
        archetype: "Rei Sagrado",
        description:
          "Herói relutante que transita do exílio autoimposto (Passolargo) à identidade plena de Rei Elessar.",
      },
      {
        character: "Gollum / Sméagol",
        archetype: "Sombra",
        description:
          "Dualidade e corrupção: o Ego fraturado pela culpa contra o Id fundido ao objeto de desejo. Guia e antagonista ao mesmo tempo.",
      },
      {
        character: "Sauron",
        archetype: "Sombra Coletiva",
        description:
          "Mal estrutural, quase sem corpo: o desejo de dominação que a coletividade reprime e projeta fora de si.",
      },
    ],
    individuation:
      "A individuação é coletiva antes de individual: cada povo precisa integrar sua sombra (o poder de Sauron, a tentação do Anel) para renascer. Frodo realiza o movimento inverso — carrega a sombra até o limite e não retorna inteiro, o que torna o final uma individuação incompleta e melancólica.",
    confidence: 0.9,
  },
  symbols: {
    summary:
      "O tecido simbólico é denso e coerente: o Anel condensa poder e pecado, a escuridão o mal e a ignorância, a luz a sabedoria, e o leste a direção do perigo e da corrupção. A obra usa símbolos legíveis sem abandonar a ambiguidade.",
    symbols: [
      {
        symbol: "anel",
        meaning:
          "Manifestação física do desejo de dominação: quem o usa torna-se invisível para a consciência moral e é corroído por dentro.",
        universalMeaning:
          "Ciclo, aliança e totalidade — aqui invertido em armadilha de poder absoluto.",
        presence: "forte",
        historicalParallels: ["Anel dos Nibelungos", "O Anel de Giges", "Aladim"],
      },
      {
        symbol: "escuridão",
        meaning:
          "Mordor e a escuridão de Sauron: o mal como ausência de luz e de individualidade.",
        universalMeaning: "Ignorância, inconsciente e morte.",
        presence: "forte",
        historicalParallels: ["Hades grego", "Niflheim nórdico", "Duat egípcio"],
      },
      {
        symbol: "luz",
        meaning:
          "A Luz de Eärendil e a chama de Gandalf: sabedoria e esperança que resistem mesmo no escuro.",
        universalMeaning: "Consciência, revelação e vida.",
        presence: "forte",
        historicalParallels: ["Luz de Amaterasu", "Fogo de Prometeu"],
      },
      {
        symbol: "travessia da água",
        meaning:
          "Rios, o Anduin e o mar do Oeste: passagem entre estados e, no fim, o limiar da morte.",
        universalMeaning: "Transição, purificação e retorno à origem.",
        presence: "moderado",
        historicalParallels: ["Estige", "Rio dos Mortos egípcio", "Jordão"],
      },
      {
        symbol: "montanha",
        meaning:
          "A Montanha da Perdição é a fonte do poder do Anel: destruí-lo exige retornar à origem do desejo destrutivo.",
        universalMeaning: "Eixo do mundo, prova e transcendência.",
        presence: "forte",
        historicalParallels: ["Olimpo", "Sinai", "Fuji"],
      },
      {
        symbol: "descida ao submundo",
        meaning:
          "Moria é uma descida ao inconsciente: lugar escuro, subterrâneo e cheio de perigos esquecidos, onde o mentor confronta um trauma primordial.",
        universalMeaning: "Morte simbólica e conhecimento proibido.",
        presence: "forte",
        historicalParallels: ["Descida de Inanna", "Katábasis de Orfeu", "Nekyia de Odisseu"],
      },
    ],
    confidence: 0.88,
  },
  themes: {
    summary:
      "Sob o conflito aparente entre Bem e Mal, o tema central é a natureza corruptora do poder e a resiliência do espírito humilde. A vitória não vem da força, mas da perseverança e lealdade de criaturas pequenas e sem ambição.",
    themes: [
      "poder e corrupção",
      "sacrifício e dever",
      "piedade e misericórdia",
      "amizade e lealdade",
      "industrialização versus natureza",
      "morte e imortalidade",
      "esperança versus desespero",
    ],
    existentialQuestions: [
      "É possível deter o poder sem ser corrompido por ele?",
      "Por que pequenas virtudes vencem forças que a razão não pode derrotar?",
      "O que resta de um herói que salvou o mundo e perdeu a própria paz?",
    ],
    ethicalDilemmas: [
      "Poupar Gollum parece erro tático, mas é o ato que salva a missão: a misericórdia pode ser estratégia?",
      "Destruir o Anel exige renunciar a ele no momento em que ele oferece tudo.",
      "A vitória justifica o custo humano e ecológico da guerra?",
    ],
    confidence: 0.92,
  },
  psychoanalysis: {
    summary:
      "A obra funciona como alegoria das lutas internas da psique: o Anel é o Id, Gollum é a cisão psíquica e Sauron é a sombra coletiva. A leitura é potente, mas interpretativa.",
    complexes: [
      "Complexo do herói sacrificial (Frodo)",
      "Cisão psíquica / splitting (Gollum–Sméagol)",
      "Complexo do pai e da linhagem (Aragorn, Boromir, Denethor)",
      "Complexo da Grande Mãe (Laracna)",
    ],
    unconsciousDesires: [
      "Ser reconhecido sem precisar carregar o fardo (Frodo e Boromir)",
      "Recuperar a totalidade perdida (Gollum e o Anel)",
      "Retornar ao útero protetor do Condado",
      "Dominar o caos por meio de uma ordem única (Sauron)",
    ],
    freudianReading:
      "O Um Anel é a representação quase didática do Id: fonte de desejos primitivos e de gratificação instantânea, indiferente à moral e à realidade. Usá-lo é ceder ao impulso e ficar \"invisível\" ao Superego. O fardo de Frodo é a luta do Ego para reprimir um Id que ganha força a cada passo; a falha final na Montanha mostra o limite do Ego diante do desejo. Gollum/Sméagol é um caso de cisão: o Ego fraturado pela culpa do assassinato contra um Id fundido ao objeto de desejo.",
    jungianReading:
      "A travessia até Mordor é uma jornada para confrontar a própria Sombra, ampliada e externalizada pelo Anel; Sauron é a Sombra coletiva da Terra-média. Moria é a descida ao inconsciente, onde o Velho Sábio confronta o Balrog — um trauma primordial. Laracna atualiza o arquétipo da Mãe Terrível, devoradora e caótica. A individuação de Frodo é incompleta: ele retorna marcado e parte para o Oeste, porque nem toda descida permite volta ao ponto de partida.",
    speculative: true,
    disclaimer:
      "Leitura interpretativa de caráter especulativo. Não constitui diagnóstico clínico nem afirmação sobre a biografia do autor.",
    confidence: 0.82,
  },
  cultural: {
    summary:
      "Obra profundamente enraizada na primeira metade do século XX: a experiência de trincheira de Tolkien, a ascensão dos totalitarismos e a nostalgia de um mundo rural pré-industrial organizam a imaginação da Terra-média.",
    historicalContext:
      "Tolkien serviu na Primeira Guerra Mundial, e a carnificina da guerra industrializada ecoa na desolação de Mordor e nos Campos dos Mortos; a camaradagem entre soldados em face do horror está no centro da relação Frodo–Sam. A ascensão do nazismo e do stalinismo nos anos 1930–40 oferece o paralelo histórico da ameaça de Sauron — uma ordem única que esmaga a individualidade.",
    culturalInfluences: [
      "Mitologia nórdica e germânica (nomes, anões, o anel mágico)",
      "Beowulf e a épica anglo-saxã (cultura de Rohan)",
      "Kalevala finlandês (influência na criação do quenya)",
      "Tradição católica (queda, redenção, piedade, eucatástrofe)",
      "Romance medieval e filologia comparada",
    ],
    valuesAndTensions: [
      "Nostalgia rural e crítica à industrialização destrutiva (Condado versus Isengard)",
      "Heroísmo como perseverança humilde, não como força — subversão do ideal épico",
      "Piedade e misericórdia contra a lógica utilitária da guerra",
      "Melancolia do progresso: a vitória custa o fim da era mágica dos Elfos",
    ],
    reception:
      "Revitalizou e praticamente definiu a alta fantasia moderna: raças, mapas, línguas construídas e o Senhor das Trevas tornaram-se pilares do gênero. As adaptações de Peter Jackson (2001–2003) ampliaram o alcance popular e reabriram debates sobre fidelidade, ritmo e representação; a obra permanece referência em estudos de mitopoese e narrativa.",
    confidence: 0.9,
  },
};

// ---------------------------------------------------------------------------
// Perseu (exemplo canônico dos blueprints)
// ---------------------------------------------------------------------------

const PERSEU: ReferenceDossier = {
  id: "perseu",
  title: "Perseu",
  aliases: ["perseu", "perseus", "medusa", "andrômeda", "andromeda"],
  provenance:
    "Blueprints “Explorador Mitológico Universal” e “Análise de Narrativas Mitológicas e Culturais” — Perseu é o caso de uso exemplar dos documentos.",
  facts: {
    name: "Perseu",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Hesíodo e Pseudo-Apolodoro como fontes tardias)",
    characters: ["Perseu", "Medusa", "Atena", "Hermes", "Andrômeda", "Danae"],
    synopsis:
      "Filho de Zeus e Danae, Perseu é enviado por Polidectes a decapitar Medusa, cujo olhar petrifica. Com escudo espelhado, sandálias aladas e a foice de Hermes, vence a górgona sem olhá-la, resgata Andrômeda de um monstro marinho e retorna para cumprir o destino — tornando-se fundador de uma linhagem real.",
    found: true,
    variants: [],
  },
  structure: {
    summary:
      "Estrutura de conto de fadas heróico no sentido proppiano: nascimento miraculoso, tarefa impossível imposta por um rei hostil, auxílio sobrenatural, vitória por astúcia e resgate. A narrativa é uma das matrizes do motivo do herói que derrota o monstro para salvar a comunidade.",
    acts: 3,
    beats: [
      "nascimento_miraculoso",
      "exposicao_do_heroi",
      "missao_impossivel",
      "auxilio_divino",
      "monstro_a_ser_morto",
      "resgate",
      "retorno_e_fundacao",
    ],
    incitingIncident:
      "Polidectes exige a cabeça de Medusa como preço de hospitalidade — a tarefa impossível que dispara a jornada.",
    climax:
      "A decapitação de Medusa, executada com o escudo espelhado e a foice, sem que o herói encare a górgona diretamente.",
    resolution:
      "Perseu liberta Andrômeda, retorna a Serifos, petrifica Polidectes com a cabeça da Medusa e cumpre a profecia que o tornava instrumento do destino de Acrísio.",
    tone: "mítico-aventuresco",
    heroJourney: journey({
      "Mundo Comum": "Danae e o filho criados em exílio, longe da casa de Acrísio.",
      "Chamado à Aventura":
        "Polidectes impõe a tarefa da cabeça de Medusa como prova de valor.",
      "Recusa do Chamado":
        "Não há recusa explícita: o herói aceita, mas parte sem saber como vencer.",
      "Encontro com o Mentor":
        "Atena e Hermes entregam escudo espelhado, sandálias aladas e orientação.",
      "Travessia do Primeiro Limiar":
        "A partida para os confins do mundo, território das górgonas.",
      "Testes, Aliados e Inimigos":
        "As Greias e os objetos mágicos; o encontro com as ninfas e a aproximação do covil.",
      "Aproximação da Caverna Oculta":
        "A entrada no domínio de Medusa, vigiado por pedras que já foram homens.",
      Provação:
        "A decapitação: vitória por astúcia e mediação técnica (o reflexo), não por confronto direto.",
      Recompensa: "A cabeça da górgona, arma ambivalente que petrifica quem a olha.",
      "Caminho de Volta": "O retorno com o troféu e o encontro com Andrômeda acorrentada.",
      Ressurreição: "O resgate de Andrômeda e a derrota do monstro marinho.",
      "Retorno com Elixir":
        "A fundação de Micenas e a consumação do destino de Acrísio: o elixir é a linhagem.",
    }),
    confidence: 0.86,
  },
  archetypes: {
    summary:
      "Perseu é o herói auxiliado: sua força vem da mediação divina e da astúcia, não da potência bruta. Medusa condensa o feminino terrível e o poder do olhar; Atena e Hermes funcionam como mentores complementares (sabedoria e travessia).",
    archetypes: [
      {
        character: "Perseu",
        archetype: "Herói",
        description:
          "Objetivo consciente: cumprir a tarefa e salvar a mãe. Objetivo inconsciente: provar origem divina e fundar linhagem.",
      },
      {
        character: "Medusa",
        archetype: "Sombra",
        description:
          "O monstro como sombra feminina: o olhar que paralisa e transforma em pedra.",
      },
      {
        character: "Atena",
        archetype: "Mentor",
        description:
          "Sabedoria estratégica: empresta o escudo espelhado, ensina a não encarar o abismo de frente.",
      },
      {
        character: "Hermes",
        archetype: "Trickster",
        description:
          "Travessia e astúcia: fornece meios de deslocamento e a arma decisiva.",
      },
      {
        character: "Andrômeda",
        archetype: "Anima",
        description:
          "O resgate dá sentido social à vitória: o herói só se completa ao salvar o outro.",
      },
    ],
    individuation:
      "A individuação se dá pela mediação simbólica: Perseu não vence olhando o monstro, mas pelo reflexo — integrar a sombra sem ser petrificado por ela exige distância e instrumento. É uma das formulações mais antigas desse processo.",
    confidence: 0.8,
  },
  symbols: {
    summary:
      "Os símbolos são operacionais: o reflexo, o olhar, a cabeça cortada e o voo. Cada objeto é uma tecnologia simbólica de sobrevivência àquilo que não pode ser encarado diretamente.",
    symbols: [
      {
        symbol: "monstro a ser morto",
        meaning:
          "Medusa como ameaça que paralisa a comunidade; o herói é o instrumento coletivo de libertação.",
        universalMeaning: "O obstáculo que precisa ser nomeado e enfrentado.",
        presence: "forte",
        historicalParallels: ["São Jorge e o dragão", "Beowulf e Grendel", "Indra e Vritra"],
      },
      {
        symbol: "auxílio divino",
        meaning:
          "Atena e Hermes tornam possível o impossível: a vitória é mediada, nunca solitária.",
        universalMeaning: "Graça, orientação e transmissão de conhecimento.",
        presence: "forte",
        historicalParallels: ["Gilgamesh e Shamash", "Eneias e Vênus", "Arjuna e Krishna"],
      },
      {
        symbol: "espelho",
        meaning:
          "O escudo espelhado permite vencer sem olhar: o conhecimento indireto é a arma.",
        universalMeaning: "Reflexão, autoconsciência e imagem.",
        presence: "forte",
        historicalParallels: ["Narciso", "Espelhos de Amaterasu", "Escudo de Eneias"],
      },
      {
        symbol: "travessia",
        meaning: "O voo até os confins do mundo e o retorno: passagem entre ordens de realidade.",
        universalMeaning: "Rito de passagem e mudança de estado.",
        presence: "moderado",
        historicalParallels: ["Odisseu", "Jasão", "Eneias"],
      },
      {
        symbol: "resgate",
        meaning:
          "Andrômeda acorrentada: a vitória só se completa quando protege alguém da comunidade.",
        universalMeaning: "Salvação, aliança e continuidade da vida.",
        presence: "moderado",
        historicalParallels: ["Teseu e Ariadne", "Héracles e Hesíone", "São Jorge e a princesa"],
      },
    ],
    confidence: 0.84,
  },
  themes: {
    summary:
      "O mito articula destino, astúcia e legitimação: o herói é instrumento de uma profecia que não controla. A vitória pertence a quem aceita ser mediado — por deuses, objetos ou reflexos.",
    themes: [
      "destino versus livre-arbítrio",
      "astúcia contra força",
      "auxílio sobrenatural",
      "herói e monstro",
      "resgate e fundação",
    ],
    existentialQuestions: [
      "É possível escapar de uma profecia ou apenas escolher o caminho até ela?",
      "Quem é o monstro: a górgona ou o olhar que a teme?",
      "O que legitima o herói — a origem divina ou o serviço à comunidade?",
    ],
    ethicalDilemmas: [
      "Usar a cabeça de Medusa como arma repete a violência que o herói pretendia deter.",
      "A tarefa é imposta por um rei abusivo: obedecer é virtude ou cumplicidade?",
    ],
    confidence: 0.85,
  },
  psychoanalysis: {
    summary:
      "A leitura psicanalítica de Perseu gira em torno do olhar, da castração simbólica e do feminino terrível. É uma das narrativas mais produtivas para pensar o medo do outro e a necessidade de mediação.",
    complexes: [
      "Complexo de castração (a cabeça decapitada)",
      "Medo do feminino arcaico (Medusa como Mãe Terrível)",
      "Complexo do herói (necessidade de provar origem)",
    ],
    unconsciousDesires: [
      "Ser reconhecido pelo pai divino",
      "Livrar-se do poder materno devorador",
      "Controlar o olhar do outro",
    ],
    freudianReading:
      "A cabeça da Medusa é o símbolo clássico do horror à castração: o olhar que petrifica paralisa o desejo. Perseu vence usando o reflexo — ou seja, por deslocamento e mediação simbólica, nunca pelo contato direto. O retorno com o troféu e o casamento com Andrômeda selam a passagem para a ordem adulta.",
    jungianReading:
      "Medusa é uma manifestação da Sombra e do feminino arcaico não integrado: tudo o que olha de volta e transforma em pedra. Atena (sabedoria) e Hermes (movimento) representam funções psíquicas que permitem enfrentar o inconsciente sem ser dissolvido por ele. A individuação exige o instrumento — a consciência reflexiva.",
    speculative: true,
    disclaimer:
      "Leitura interpretativa de caráter especulativo; não constitui diagnóstico nem afirmação sobre a Grécia antiga como um todo.",
    confidence: 0.78,
  },
  cultural: {
    summary:
      "Mito de fundação da Argólida, Perseu legitima linhagens reais (Micenas, Tirinto) ao mesmo tempo em que dramatiza a passagem do mundo ctônico das górgonas para a ordem olímpica representada por Atena.",
    historicalContext:
      "Os relatos de Perseu circulam da tradição oral arcaica à sistematização escrita (Hesíodo, depois Pseudo-Apolodoro). A função do mito é genealógica e política: ligar famílias nobres a Zeus e a heróis civilizadores. O motivo da górgona, porém, é mais antigo: máscaras apotropaicas (gorgoneia) protegem templos e escudos muito antes da narrativa escrita, o que sugere uma divindade ou potência anterior, domesticada pela épica olímpica.",
    culturalInfluences: [
      "Tradição oral arcaica grega e a Teogonia de Hesíodo",
      "Culto de Atena e a iconografia da gorgoneia",
      "Mitologias do Oriente Próximo (herói que vence o monstro)",
      "Biblioteca de Pseudo-Apolodoro (compilação posterior)",
    ],
    valuesAndTensions: [
      "Legitimação de linhagens reais por ascendência divina",
      "Vitória pela métis (astúcia) e não pela bía (força)",
      "Domesticação de potências ctônicas femininas pela ordem olímpica",
      "Hospitalidade e dívida como motores das relações sociais",
    ],
    reception:
      "Perseu permanece entre os mitos gregos mais representados: escudos, cerâmicas, esculturas de Cellini e, na cultura pop, filmes como Fúria de Titãs. O par Perseu–Medusa tornou-se matriz visual do herói que enfrenta o monstro e também objeto de releituras feministas que devolvem voz a Medusa.",
    confidence: 0.84,
  },
};

// ---------------------------------------------------------------------------
// Prometeu (trickster cultural e herói sacrificial)
// ---------------------------------------------------------------------------

const PROMETEU: ReferenceDossier = {
  id: "prometeu",
  title: "Prometeu",
  aliases: ["prometeu", "prometheus", "roubo do fogo"],
  provenance:
    "Blueprint “Explorador Mitológico Universal” — Prometeu é o exemplo de conexão usado em todo o documento (Prometeu ↔ Loki ↔ V de Vingança ↔ Tony Stark).",
  facts: {
    name: "Prometeu",
    type: "mito",
    origin: "Mitologia Grega",
    period: "Antiguidade Clássica (Hesíodo, séc. VIII a.C.; Ésquilo, séc. V a.C.)",
    characters: ["Prometeu", "Zeus", "Hefesto", "Hermes", "Io"],
    synopsis:
      "Titã que rouba o fogo dos deuses e o entrega à humanidade, ensinando-lhe também as artes e as técnicas. Punido por Zeus, é acorrentado a uma montanha onde uma águia devora seu fígado, que se regenera a cada dia. Encarna o preço do conhecimento e da rebeldia.",
    found: true,
    variants: [],
  },
  structure: {
    summary:
      "Estrutura trágica de transgressão e punição: não há jornada de retorno, e sim uma doação irreversível. O arco é anti-heroico no sentido clássico — o protagonista não restaura a ordem, ele a rompe para fundar a civilização.",
    acts: 3,
    beats: [
      "transgressao",
      "roubo_do_fogo",
      "doacao_a_humanidade",
      "punição_divina",
      "resistencia_e_profecia",
    ],
    incitingIncident:
      "O engano do sacrifício em Mecone: Prometeu cria uma ruptura entre deuses e homens.",
    climax:
      "O roubo do fogo e a entrega aos humanos — o momento em que a ordem divina é irreversivelmente alterada.",
    resolution:
      "A punição eterna: acorrentado, Prometeu resiste e mantém a profecia sobre a queda de Zeus. A resolução não fecha o conflito; ela o eterniza.",
    tone: "trágico-prometeico",
    heroJourney: journey({
      "Mundo Comum": "O mundo dos titãs e a ordem recém-instaurada por Zeus.",
      "Chamado à Aventura":
        "Prometeu reconhece a vulnerabilidade dos humanos sem técnica e sem fogo.",
      "Recusa do Chamado": "Não há recusa: a transgressão é deliberada e antecipada.",
      "Encontro com o Mentor":
        "Prometeu é ele mesmo o portador do saber (métis); sua mentora é a própria inteligência técnica.",
      "Travessia do Primeiro Limiar":
        "O roubo do fogo: a passagem de aliado dos deuses a subversor da ordem.",
      "Testes, Aliados e Inimigos":
        "A cólera de Zeus, a cumplicidade silenciosa dos humanos e a punição de Hefesto.",
      "Aproximação da Caverna Oculta":
        "O momento em que o castigo se torna inevitável e Prometeu é acorrentado ao Cáucaso.",
      Provação:
        "A águia e o fígado regenerado: a dor infinita como preço do dom concedido.",
      Recompensa:
        "Não há recompensa material — o elixir é o fogo e a técnica entregues à humanidade.",
      "Caminho de Volta": "Impossível: a punição eterna substitui o retorno.",
      Ressurreição:
        "A libertação por Héracles, séculos depois (em versões posteriores), funciona como redenção tardia.",
      "Retorno com Elixir":
        "O elixir já foi entregue antes do sacrifício: a civilização é o seu retorno.",
    }),
    confidence: 0.87,
  },
  archetypes: {
    summary:
      "Prometeu é o trickster que se torna herói cultural e mártir: engana os deuses em benefício dos humanos, paga com o corpo e funda a técnica. Zeus é a autoridade que pune, não exatamente a sombra — o conflito é entre poder e conhecimento.",
    archetypes: [
      {
        character: "Prometeu",
        archetype: "Herói Cultural",
        description:
          "Trickster que doa a técnica e assume o custo: objetivo consciente é salvar a humanidade; inconsciente, talvez, é superar o pai divino.",
      },
      {
        character: "Zeus",
        archetype: "Rei Sagrado",
        description:
          "Autoridade cósmica que pune a transgressão: o poder que não admite partilha do fogo.",
      },
      {
        character: "Hefesto",
        archetype: "Guardião do Limiar",
        description:
          "Executa a punição contra a própria vontade: o artesão que reconhece no outro seu igual.",
      },
      {
        character: "Io",
        archetype: "Anima",
        description:
          "Vítima do mesmo poder que pune Prometeu; sua peregrinação espelha o exílio do titã.",
      },
    ],
    individuation:
      "A psique prometeica é a da consciência que se separa da autoridade para fundar autonomia. O preço é a cisão entre saber e poder, que a modernidade herdou: conhecimento sem legitimação e técnica sem sabedoria.",
    confidence: 0.82,
  },
  symbols: {
    summary:
      "Fogo, fígado, montanha e corrente: cada elemento é uma tecnologia de leitura sobre conhecimento, castigo e resistência.",
    symbols: [
      {
        symbol: "fogo do conhecimento",
        meaning:
          "O fogo roubado é a técnica que transforma o humano em agente: não é calor, é poder de fazer.",
        universalMeaning: "Consciência, iluminação e poder criador.",
        presence: "forte",
        historicalParallels: ["Loki e o fogo nórdico", "Mauí e o fogo maori", "Adão e a árvore do conhecimento"],
      },
      {
        symbol: "punição divina",
        meaning:
          "A águia e o fígado regenerado: o castigo é contínuo e visa o corpo, não a vontade.",
        universalMeaning: "Dívida, expiação e limite transgressor.",
        presence: "forte",
        historicalParallels: ["Tântalo", "Sísifo", "Lúcifer"],
      },
      {
        symbol: "sacrifício pela humanidade",
        meaning:
          "O sofrimento individual é justificado pela libertação coletiva: matriz do mártir civilizador.",
        universalMeaning: "Redenção pelo sofrimento voluntário.",
        presence: "forte",
        historicalParallels: ["Cristo", "Amon-Rá e a humanidade", "Odín pendurado em Yggdrasil"],
      },
      {
        symbol: "desafio aos deuses",
        meaning:
          "A recusa da hierarquia divina em nome da inteligência: a técnica como forma de poder.",
        universalMeaning: "Hybris e a tensão entre autonomia e limite.",
        presence: "moderado",
        historicalParallels: ["Torre de Babel", "Fausto", "Frankestein"],
      },
      {
        symbol: "corrente",
        meaning:
          "A imobilidade do titã contrasta com a mobilidade do conhecimento entregue: o corpo preso, a técnica livre.",
        universalMeaning: "Prisão, necessidade e destino.",
        presence: "moderado",
        historicalParallels: ["Ananque", "Fate nórdico", "Cárcere de Fausto"],
      },
    ],
    confidence: 0.86,
  },
  themes: {
    summary:
      "O mito funda um dos grandes temas da cultura ocidental: o conhecimento como bem ambivalente, conquistado contra a autoridade e pago com sofrimento.",
    themes: [
      "conhecimento proibido",
      "rebeldia contra o poder",
      "sacrifício pela humanidade",
      "criação e civilização",
      "hybris e limite",
    ],
    existentialQuestions: [
      "O progresso técnico justifica o sofrimento que causa?",
      "Quem tem direito de distribuir conhecimento?",
      "É possível ser humano sem transgredir?",
    ],
    ethicalDilemmas: [
      "Prometeu beneficia a humanidade contra a ordem legítima dos deuses: é herói ou traidor?",
      "O fogo cria civilização e também armas: o dom é ético em si mesmo?",
    ],
    confidence: 0.9,
  },
  psychoanalysis: {
    summary:
      "A leitura psicanalítica lê Prometeu como a figura da pulsão de saber e da rivalidade com a autoridade paterna, articulada à culpa e ao gozo do castigo.",
    complexes: [
      "Complexo de Édipo (rivalidade com a autoridade divina)",
      "Complexo de Prometeu (pulsão de saber e culpa)",
      "Narcisismo criador (o titã como benfeitor da humanidade)",
    ],
    unconsciousDesires: [
      "Ocupar o lugar do pai/Zeus",
      "Ser reconhecido como criador da humanidade",
      "Sofrer para expiar a culpa de saber demais",
    ],
    freudianReading:
      "O roubo do fogo é a aquisição da técnica e da cultura — o domínio sobre a natureza que exige renúncia pulsional. A punição permanente no fígado (órgão das paixões na tradição antiga) funciona como retorno do recalcado: o desejo de saber não desaparece, apenas se torna ferida reiterada. Freud via na figura prometeica o modelo do ego que arrisca para conquistar autonomia.",
    jungianReading:
      "Prometeu é o herói cultural que traz a luz da consciência para a humanidade — o arquétipo do sábio que desafia a ordem coletiva. Zeus é a autoridade arquetípica que precisa ser confrontada para que a individuação aconteça; o castigo é o preço da diferenciação. A corrente no Cáucaso é a fixação necessária antes da libertação por Héracles, símbolo da força que integra o herói à ordem.",
    speculative: true,
    disclaimer:
      "Leitura interpretativa de caráter especulativo; não constitui diagnóstico nem reduz a figura mítica à psicologia individual.",
    confidence: 0.8,
  },
  cultural: {
    summary:
      "Prometeu é uma das figuras mais reutilizadas do imaginário ocidental: da tragédia grega ao Iluminismo, do romantismo de Shelley ao cinema de ficção científica, ele continua a nomear o risco da técnica.",
    historicalContext:
      "A figura aparece em Hesíodo como quem engana Zeus em favor dos homens; na tragédia Prometeu Acorrentado, atribuída a Ésquilo, ganha o contorno do resistente político que enfrenta a tirania. Essa dupla leitura — trickster e insurgente — atravessa a modernidade: o Iluminismo a transforma em emblema da emancipação pela razão; o romantismo, em mártir da liberdade; o século XX, em alegoria dos riscos da tecnologia.",
    culturalInfluences: [
      "Hesíodo (Teogonia, Trabalhos e Dias)",
      "Tragédia ática (Prometeu Acorrentado)",
      "Iluminismo e a metáfora da luz da razão",
      "Romantismo inglês (Shelley, Prometheus Unbound)",
      "Ficção científica e o Frankenstein de Mary Shelley (Prometeu moderno)",
    ],
    valuesAndTensions: [
      "Autonomia do conhecimento contra a autoridade transcendente",
      "Otimismo iluminista versus angústia moderna sobre a técnica",
      "Sacrifício individual como fundamento da coletividade",
      "Hybris e a suspeita de que todo progresso cobra um preço",
    ],
    reception:
      "De Ésquilo a Mary Shelley, de Nietzsche a Blade Runner, Prometeu funciona como operador cultural para pensar tecnologia, rebeldia e responsabilidade. É também o exemplo central dos blueprints legados para demonstrar conexões não óbvias com Loki, V de Vingança e Tony Stark.",
    confidence: 0.88,
  },
};

// ---------------------------------------------------------------------------
// Édipo (a matriz da leitura psicanalítica)
// ---------------------------------------------------------------------------

const EDIPO: ReferenceDossier = {
  id: "edipo",
  title: "Édipo",
  aliases: ["edipo", "oedipus", "edipo rei", "jocasta", "esfinge"],
  provenance:
    "Blueprints legados (Perseu/Prometeu/Fausto como tríade de demonstração) + a lente psicanalítica documentada nos documentos.",
  facts: {
    name: "Édipo",
    type: "mito",
    origin: "Mitologia Grega / Tragédia Ática",
    period: "Século V a.C. (Sófocles)",
    characters: ["Édipo", "Jocasta", "Laio", "Esfinge", "Tirésias", "Creonte"],
    synopsis:
      "Profetizado a matar o pai e desposar a mãe, Édipo é abandonado e criado em Corinto. Ao fugir do oráculo, mata um ancião — o próprio pai — e decifra o enigma da Esfinge, tornando-se rei de Tebas ao casar-se com Jocasta. Quando a verdade vem à luz, ele se cega: a tragédia do conhecimento que chega tarde.",
    found: true,
    variants: [],
  },
  structure: {
    summary:
      "Tragédia de revelação (anagnórise) com unidade de tempo e ação: a peça caminha não para fora, mas para dentro do passado. O herói é detetive de si mesmo; cada avanço da investigação aprofunda a catástrofe. A estrutura demonstra que o destino se cumpre precisamente pelo esforço de evitá-lo.",
    acts: 3,
    beats: [
      "profecia",
      "fuga_de_corinto",
      "esfinge",
      "reinado_e_peste",
      "investigacao",
      "revelacao",
      "cegueira_e_exilio",
    ],
    incitingIncident:
      "A peste em Tebas e o oráculo que exige a punição do assassino de Laio: Édipo inicia a investigação que o condena.",
    climax:
      "A revelação: Édipo reconhece em si o assassino do pai e o marido da mãe — anagnórise e peripécia no mesmo movimento.",
    resolution:
      "Jocasta se enforca; Édipo fura os próprios olhos e parte para o exílio. A verdade não liberta: ela cumpre o destino.",
    tone: "trágico",
    heroJourney: journey({
      "Mundo Comum": "O palácio de Corinto, onde Édipo cresce como príncipe adotivo.",
      "Chamado à Aventura":
        "A profecia do oráculo: matar o pai e casar com a mãe.",
      "Recusa do Chamado":
        "A recusa se converte em fuga: Édipo abandona Corinto para escapar do destino.",
      "Encontro com o Mentor":
        "Tirésias, o adivinho cego, aponta a verdade; Édipo a rejeita.",
      "Travessia do Primeiro Limiar":
        "A fuga de Corinto e o assassinato no cruzamento de três estradas.",
      "Testes, Aliados e Inimigos":
        "A Esfinge, os enigmas e a peste: cada prova aumenta seu poder e oculta a culpa.",
      "Aproximação da Caverna Oculta":
        "A investigação se volta para o passado e para os testemunhos do crime.",
      Provação:
        "A revelação total: o herói descobre ser ele próprio a resposta ao enigma.",
      Recompensa:
        "O conhecimento — amargo, inútil: a verdade chega depois da catástrofe.",
      "Caminho de Volta": "O exílio: não há retorno à posição de rei.",
      Ressurreição:
        "A cegueira como forma de visão: Édipo se torna, em Colono, um herói protetor.",
      "Retorno com Elixir":
        "O elixir é a lição trágica: o conhecimento de si não isenta do destino.",
    }),
    confidence: 0.9,
  },
  archetypes: {
    summary:
      "Édipo é o herói trágico por excelência: aquele cuja virtude é o instrumento de sua ruína. Tirésias é o mentor cego; Jocasta, a Anima que oculta o passado; a Esfinge, o guardião do limiar que exige decifração.",
    archetypes: [
      {
        character: "Édipo",
        archetype: "Herói Trágico",
        description:
          "Objetivo consciente: livrar Tebas da peste. Inconsciente: descobrir a verdade sobre si, ainda que ela o destrua.",
      },
      {
        character: "Tirésias",
        archetype: "Mentor",
        description:
          "O adivinho cego que vê o que os outros não veem; sua verdade é rejeitada até ser inevitável.",
      },
      {
        character: "Jocasta",
        archetype: "Anima",
        description:
          "Amante, mãe e cúmplice do silêncio: tenta interromper a investigação para preservar a vida.",
      },
      {
        character: "Esfinge",
        archetype: "Guardião do Limiar",
        description:
          "O enigma como prova de entrada: quem responde \"o homem\" entra na cidade — e na própria tragédia.",
      },
      {
        character: "Laio",
        archetype: "Sombra",
        description:
          "O pai morto, cuja violência original (o abandono do filho) retorna como destino.",
      },
    ],
    individuation:
      "A individuação é aqui impossível: Édipo descobre quem é, mas ao preço de deixar de ser rei, marido e pai. A tragédia mostra o limite do autoconhecimento quando ele chega tarde — o inconsciente já realizou o ato.",
    confidence: 0.88,
  },
  symbols: {
    summary:
      "Profecia, enigma, cegueira e cruzamento: o mito é um sistema de avisos que o herói lê sempre tarde demais.",
    symbols: [
      {
        symbol: "profecia",
        meaning:
          "O oráculo anuncia o que a fuga acabará por realizar: saber o futuro é o primeiro passo para cumpri-lo.",
        universalMeaning: "Destino, onisciência e o limite do livre-arbítrio.",
        presence: "forte",
        historicalParallels: ["Macbeth", "Máquina do destino nórdico", "Cassandra"],
      },
      {
        symbol: "enigma",
        meaning:
          "A Esfinge exige decifração: a resposta (\"o homem\") é a chave da cidade e da perdição.",
        universalMeaning: "Conhecimento iniciático e prova de passagem.",
        presence: "forte",
        historicalParallels: ["Enigmas de Amon", "Mito de Édipo e a esfinge tebana", "Charada de Turandot"],
      },
      {
        symbol: "cegueira",
        meaning:
          "Tirésias é cego e vê; Édipo vê e se cega: a visão física e a visão moral se invertem.",
        universalMeaning: "Insight, renúncia e conhecimento interior.",
        presence: "forte",
        historicalParallels: ["Tirésias", "Cegueira de Belisário", "Gloucester em Rei Lear"],
      },
      {
        symbol: "cruzamento de estradas",
        meaning:
          "O assassinato no trifúrquio (três caminhos) é o ponto de não retorno — escolha e destino no mesmo nó.",
        universalMeaning: "Encruzilhada, decisão e destino.",
        presence: "moderado",
        historicalParallels: ["Hécate triforme", "Encruzilhada de Exu", "Y-junction de Fausto"],
      },
      {
        symbol: "peste",
        meaning:
          "A peste de Tebas é o corpo coletivo adoecido por uma culpa não expiada: a investigação nasce do sintoma.",
        universalMeaning: "Contaminação moral, castigo e crise.",
        presence: "moderado",
        historicalParallels: ["Peste de Atenas", "Pragas do Êxodo", "Apocalipse"],
      },
    ],
    confidence: 0.87,
  },
  themes: {
    summary:
      "O mito articula destino e livre-arbítrio, conhecimento e sofrimento, culpa e expiação. É a matriz trágica do Ocidente e, por isso, também a matriz de sua psicanálise.",
    themes: [
      "destino versus livre-arbítrio",
      "busca da verdade",
      "culpa e expiação",
      "conhecimento e sofrimento",
      "poder e cegueira",
    ],
    existentialQuestions: [
      "Se fugir do destino é o que o cumpre, existe livre-arbítrio?",
      "Vale saber a verdade quando ela destrói tudo?",
      "Somos responsáveis por atos que não sabíamos cometer?",
    ],
    ethicalDilemmas: [
      "Édipo investiga com honestidade exemplar e isso o condena: a integridade é virtude ou hybris?",
      "Jocasta tenta silenciar a verdade para preservar a família: proteção ou covardia?",
    ],
    confidence: 0.92,
  },
  psychoanalysis: {
    summary:
      "Édipo é a fonte do conceito freudiano homônimo: o desejo inconsciente de ocupar o lugar do pai junto à mãe, recalcado e retornando como sintoma. Uso clínico exige cautela.",
    complexes: [
      "Complexo de Édipo",
      "Complexo de culpa inconsciente",
      "Narcisismo do herói decifrador",
    ],
    unconsciousDesires: [
      "Ocupar o lugar do pai",
      "Possuir a mãe",
      "Não saber (para não ter de renunciar)",
    ],
    freudianReading:
      "Freud toma a tragédia como modelo do desejo infantil: matar o pai e desposar a mãe são os impulsos recalcados que a peça realiza no palco, permitindo ao espectador o gozo vicário sem culpa. A cegueira final é a castração simbólica; a investigação é a própria análise, que revela ao sujeito o que ele já sabia sem saber. O poder da leitura está em mostrar que a verdade psíquica não coincide com a intenção consciente.",
    jungianReading:
      "Na leitura junguiana, Édipo não integra a Sombra: ele a projeta na Esfinge e no destino externo, e por isso é destruído por ela. A cegueira pode ser lida como renúncia à consciência diurna em favor da visão interior — a mesma que faz de Tirésias o verdadeiro vidente. A individuação exige reconhecer o próprio mito, não apenas decifrá-lo.",
    speculative: true,
    disclaimer:
      "Leitura interpretativa e historicamente situada: o conceito de Édipo é uma construção teórica do século XX, não um diagnóstico do personagem.",
    confidence: 0.85,
  },
  cultural: {
    summary:
      "Édipo é ao mesmo tempo mito tebano, tragédia ateniense e conceito psicanalítico — uma das raras figuras cuja fortuna cultural atravessa religião, teatro e ciência.",
    historicalContext:
      "A lenda de Édipo pertence ao ciclo tebano, anterior a Sófocles, mas é na Atenas do século V a.C. que ela ganha sua forma canônica: a cidade vive a experiência da peste, da guerra e do debate sobre destino, lei e responsabilidade. A tragédia Édipo Rei, encenada provavelmente por volta de 429 a.C., faz do mito arcaico um espelho para a crise política e religiosa ateniense.",
    culturalInfluences: [
      "Ciclo tebano da tradição oral grega",
      "Tragédia ática e a poética de Aristóteles (anagnórise e catarse)",
      "Estoicismo e a discussão antiga sobre destino",
      "Psicanálise freudiana (apropriação moderna do mito)",
      "Teatro moderno e cinema (Pasolini, Cocteau, Sófocles revisitado)",
    ],
    valuesAndTensions: [
      "Responsabilidade individual diante de um destino imposto",
      "Tensão entre conhecimento (sophrosýne) e hybris",
      "A lei da cidade contra o oráculo divino",
      "A família como espaço de violência fundadora",
    ],
    reception:
      "A peça foi lida por Aristóteles como modelo da tragédia perfeita e retomada por Freud como matriz do inconsciente. No século XX, tornou-se referência para o teatro (Cocteau, Pasolini) e para a crítica estruturalista (Lévi-Strauss analisa o mito como sistema de oposições). Permanece um dos textos mais estudados do cânone ocidental.",
    confidence: 0.9,
  },
};

export const REFERENCE_DOSSIERS: ReferenceDossier[] = [
  LOTR,
  PERSEU,
  PROMETEU,
  EDIPO,
];

/** Busca por id estável. */
export function getReferenceDossier(id: string): ReferenceDossier | null {
  return REFERENCE_DOSSIERS.find((d) => d.id === id) ?? null;
}

/**
 * Encontra um dossiê de referência a partir do input livre do usuário.
 * Aceita correspondência exata de alias ou contenção mútua ("O Senhor dos Anéis"
 * ⊂ "o senhor dos aneis: a trilogia").
 */
export function findReferenceDossier(input: string): ReferenceDossier | null {
  const needle = normalizeText(input);
  if (!needle) return null;

  for (const dossier of REFERENCE_DOSSIERS) {
    const candidates = [dossier.title, ...dossier.aliases, dossier.facts.name];
    for (const candidate of candidates) {
      const norm = normalizeText(candidate);
      if (!norm) continue;
      if (norm === needle) return dossier;
      if (norm.length >= 4 && (needle.includes(norm) || norm.includes(needle))) {
        return dossier;
      }
    }
  }
  return null;
}
