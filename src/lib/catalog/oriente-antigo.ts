/**
 * Catálogo — Egito, Mesopotâmia e Mediterrâneo oriental.
 */
import type { CatalogEntry } from "@/lib/oracle-types";

export const CATALOG_ORIENTE_ANTIGO: CatalogEntry[] = [
  {
    id: "ishtar",
    name: "Descida de Ishtar",
    type: "mito",
    origin: "Mitologia Mesopotâmica",
    period: "Antiguidade (tabuletas acádias, c. 1800 a.C.)",
    synopsis:
      "Ishtar desce ao mundo dos mortos e precisa entregar uma joia de poder a cada um dos sete portões. Diante da irmã Ereshkigal, é despida e morta; sem o amor no mundo, a vida seca. Os deuses enviam um mensageiro para negociar sua volta — e alguém tem de ocupar o seu lugar.",
    motifs: ["descida ao submundo", "morte e renascimento", "seca e chuva", "irmãos rivais", "sacrifício"],
    archetypes: ["Anima/Animus", "Rainha", "Sombra"],
    themes: ["sem amor não há fertilidade", "poder despido", "resgate e substituição"],
    characters: ["Ishtar", "Ereshkigal", "Tammuz", "Namtar", "Enki"],
  },
  {
    id: "tammuz",
    name: "Tammuz e o Luto das Mulheres",
    type: "mito",
    origin: "Mitologia Mesopotâmica",
    period: "Antiguidade (culto sumério, c. 3000 a.C.; Ezequiel 8)",
    synopsis:
      "Pastor-deus amado por Ishtar, Tammuz morre e é levado ao mundo dos mortos. Ezequiel descreve mulheres sentadas à porta do templo chorando por ele. O culto trata o pranto não como desespero, mas como tecnologia ritual para reverter a estação seca.",
    motifs: ["morte e renascimento", "seca e chuva", "ciclo da vida", "perda e luto", "amor e morte", "ressurreição"],
    archetypes: ["Mártir", "Anima/Animus", "Rei Sagrado"],
    themes: ["luto como agricultura", "amor sazonal", "a deusa que chora"],
    characters: ["Tammuz", "Ishtar", "Ereshkigal", "Deméter"],
  },
  {
    id: "ahnk-amon",
    name: "A Disputa de Hórus e Set",
    type: "mito",
    origin: "Mitologia Egípcia",
    period: "Antiguidade (Papiro Chester Beatty, c. 1160 a.C.)",
    synopsis:
      "Set mata e esquarteja Osíris; Ísis recompõe o corpo e gera Hórus. O menino cresce e enfrenta o tio num julgamento interminável de deuses, com provas de força e truques. Hórus perde um olho e recupera o trono — mas Osíris já reina no mundo dos mortos.",
    motifs: ["vingança", "trono e legitimidade", "desmembramento", "julgamento dos mortos", "trapaça"],
    archetypes: ["Herói", "Trickster", "Rei Sagrado"],
    themes: ["legitimidade contestada", "força bruta contra direito", "morte que funda dinastia"],
    characters: ["Hórus", "Set", "Osíris", "Ísis", "Thoth", "Néftis"],
  },
  {
    id: "ra-e-apep",
    name: "Rá e a Serpente Apep",
    type: "mito",
    origin: "Mitologia Egípcia",
    period: "Antiguidade (Novo Império, c. 1550 a.C.)",
    synopsis:
      "Todas as noites o barco solar de Rá atravessa o submundo e é atacado por Apep, a serpente do caos que tenta engolir o sol. Sacerdotes recitavam contra ela em templos: o mito não se passava num tempo remoto, mas todas as noites, no escuro que ameaça a ordem.",
    motifs: ["ordem e caos", "serpente", "sol", "batalha contra demônio", "ciclo da vida"],
    archetypes: ["Sombra", "Rei Sagrado", "Herói"],
    themes: ["cosmos como vitória repetida", "ritual que sustenta a ordem", "escuridão que jamais é destruída de vez"],
    characters: ["Rá", "Apep", "Maat", "Set", "Thoth"],
  },
  {
    id: "gilgamesh-enkidu",
    name: "Gilgamesh e a Busca da Imortalidade",
    type: "mito",
    origin: "Mitologia Mesopotâmica",
    period: "Antiguidade (tabuletas de Nínive, c. 700 a.C.)",
    synopsis:
      "Depois da morte de Enkidu, Gilgamesh percorre o mundo atrás de Utnapishtim, o único homem que escapou do dilúvio. Passa por portões do sol, atravessa águas da morte e perde a planta da juventude para uma serpente. Volta para casa com muralhas, não com imortalidade.",
    motifs: ["busca da imortalidade", "amizade", "jornada do herói", "mortalidade", "dilúvio"],
    archetypes: ["Herói", "Aliado", "Sombra"],
    themes: ["amizade que revela o finito", "glória epopeica", "a morte é o que funda a cidade"],
    characters: ["Gilgamesh", "Enkidu", "Utnapishtim", "Humbaba", "Siduri", "Ninsun"],
  },
  {
    id: "cosmogonias",
    name: "Enuma Elish — a Vitória sobre Tiamat",
    type: "mito",
    origin: "Mitologia Mesopotâmica",
    period: "Antiguidade (Babilônia, c. 1100 a.C.)",
    synopsis:
      "A deusa primordial Tiamat e Apsu geram deuses demais; a violência cresce e Tiamat forma exércitos de monstros. Marduk, o jovem deus, oferece-se para combatê-la em troca da soberania do mundo. Divide o corpo da deusa em céu e terra, e a humanidade é feita do sangue do consorte derrotado: um deus morto nos constrói.",
    motifs: ["ordem e caos", "criação do mundo", "batalha contra demônio", "serpente", "trono e legitimidade"],
    archetypes: ["Herói Cultural", "Sombra", "Grande Mãe"],
    themes: ["violência como fundamento do cosmos", "corpo da mãe virando mundo", "a autoridade que nasce do combate"],
    characters: ["Marduk", "Tiamat", "Apsu", "Kingu", "Ea"],
  },
  {
    id: "osiris-reconstituicao",
    name: "Morte e Reconstituição de Osíris",
    type: "mito",
    origin: "Mitologia Egípcia",
    period: "Antiguidade (Textos das Pirâmides, c. 2400 a.C.)",
    synopsis:
      "O primeiro rei morre encerrado num sarcófago e lançado ao Nilo; o corpo é dispersado pelo rio. Ísis recolhe as partes, aprende a palavra que restaura e devolve ao marido uma forma capaz de gerar Hórus. O morto passa a governar outro reino, e o culto funerário ganha seu modelo.",
    motifs: ["desmembramento", "morte e renascimento", "amor e morte", "julgamento dos mortos", "palavra que salva", "ressurreição", "milagre"],
    archetypes: ["Rei Sagrado", "Grande Mãe", "Mártir"],
    themes: ["morte como trono", "fidelidade absoluta", "a palavra que reconstrói o corpo"],
    characters: ["Osíris", "Ísis", "Néftis", "Hórus", "Anúbis", "Set"],
  },
];
