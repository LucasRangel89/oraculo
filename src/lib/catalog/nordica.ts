/**
 * Catálogo — tradição nórdica e germânica.
 */
import type { CatalogEntry } from "@/lib/oracle-types";

export const CATALOG_NORDICA: CatalogEntry[] = [
  {
    id: "sigurd",
    name: "Sigurd, o Matador de Dragões",
    type: "mito",
    origin: "Mitologia Nórdica (Eddas)",
    period: "Idade Média islandesa (Völsunga Saga, séc. XIII)",
    synopsis:
      "Sigurd é criado por Regin, que o incita a matar o dragão Fáfnir e tomar o tesouro amaldiçoado. Ele mata o dragão, provoca a profecia ao provar o sangue, acorda uma valquíria adormecida entre escudos de fogo e cai na rede de feitiçaria de Gudrun e das irmãs Brunilda que destrói a casa dos Nibelungos.",
    motifs: ["monstro a ser morto", "objeto mágico", "maldição", "amor proibido", "vingança"],
    archetypes: ["Herói", "Sombra", "Anima/Animus"],
    themes: ["tesouro como armadilha", "destino que ninguém escapa", "amor e traição entrelaçados"],
    characters: ["Sigurd", "Fáfnir", "Regin", "Brunilda", "Gudrun", "Odin"],
  },
  {
    id: "ragnar-lodbrok",
    name: "Ragnar Lodbrok",
    type: "lenda",
    origin: "Mitologia Nórdica (sagas)",
    period: "Idade Média escandinava (séc. IX–XIII)",
    synopsis:
      "Ragnar conquista fama em incursões e em duelos contra serpentes e criaturas guardadas por mulheres guerreiras. Rei de difícil controle, morre numa cova de serpentes na corte de Aella, mas antes profetiza que os filhos vingariam cada víbora com um exército.",
    motifs: ["vingança", "hybris", "trono e legitimidade", "fúria guerreira", "profecia"],
    archetypes: ["Herói", "Governante", "Sombra"],
    themes: ["morte profética como herança", "vingança como dever de sangue", "glória e crueldade do guerreiro"],
    characters: ["Ragnar Lodbrok", "Lagertha", "Aella", "Bjorn", "Ivar", "Aslaug"],
  },
  {
    id: "sigrid-a-imprudente",
    name: "Sigrid, a Imprudente",
    type: "lenda",
    origin: "Mitologia Nórdica (sagas)",
    period: "Idade Média escandinava (séc. XI)",
    synopsis:
      "Viúva e soberana, Sigrid recusa pretendentes e casa-se por interesse com o rei sueco, a quem depois manda incendiar numa casa onde ele a havia humilhado. A tradição nórdica transforma o desprezo conjugal em vingança ardente — e em memória de uma mulher que não aceitava ser troféu.",
    motifs: ["vingança", "honra ferida", "trono e legitimidade", "traição", "fogo"],
    archetypes: ["Rainha", "Trickster", "Sombra"],
    themes: ["poder feminino fora das regras", "vingança como política", "humilhação e retaliação"],
    characters: ["Sigrid", "Olaf Tryggvason", "Erik", "Svend"],
  },
  {
    id: "freyr-e-gerd",
    name: "Freyr e Gerd",
    type: "mito",
    origin: "Mitologia Nórdica (Eddas)",
    period: "Idade Média islandesa (séc. XIII)",
    synopsis:
      "Freyr, deus da fertilidade, vê Gerd do outro mundo e adoece por ela. Envia Skirnir a Jötunheim, onde a ameaça com runas e maldição até conseguir o casamento. A união entre deuses e gigantas costura o ciclo das estações e a fertilidade da terra.",
    motifs: ["amor proibido", "seca e chuva", "maldição", "ciclo da vida", "sedução"],
    archetypes: ["Anima/Animus", "Aliado", "Rei Sagrado"],
    themes: ["desejo que adoece", "união entre mundos", "o sagrado da fertilidade"],
    characters: ["Freyr", "Gerd", "Skirnir", "Njord"],
  },
  {
    id: "balder",
    name: "Morte de Balder",
    type: "mito",
    origin: "Mitologia Nórdica (Eddas)",
    period: "Idade Média islandesa (séc. XIII)",
    synopsis:
      "Balder, o deus bom, é invulnerável a tudo, e os deuses se divertem atirando coisas nele. Loki descobre a única exceção — o visco — e guia a mão cega de Höd. Depois da morte, a tentativa de resgate no submundo falha por um detalhe. O mundo se encaminha para o Ragnarök.",
    motifs: ["morte", "traição", "martírio", "descida ao submundo", "apocalipse", "ragnarök", "cegueira"],
    archetypes: ["Mártir", "Trickster", "Sombra"],
    themes: ["inocência que não protege", "o mal por um detalhe", "luto que anuncia o fim"],
    characters: ["Balder", "Loki", "Höd", "Frigg", "Hermod", "Hel"],
  },
  {
    id: "volsunga",
    name: "A Saga dos Volsungos",
    type: "lenda",
    origin: "Mitologia Nórdica (sagas)",
    period: "Idade Média islandesa (séc. XIII)",
    synopsis:
      "De Sigmund, que arranca a espada da árvore no salão dos Volsungos, aos filhos incestuosos de Signy e à vingança de Sinfjotli, a saga encadeia uma linhagem inteira em torno do mesmo punho de aço. O destino se transmite pelo sangue como um fio de fogo.",
    motifs: ["espada mágica", "vingança de sangue", "maldição", "traição", "destino inevitável"],
    archetypes: ["Herói", "Sombra", "Rei Sagrado"],
    themes: ["sangue como destino", "vingança hereditária", "honra que destrói a casa"],
    characters: ["Sigmund", "Signy", "Sinfjotli", "Sigurd", "Hjördis"],
  },
  {
    id: "grendel",
    name: "Beowulf e Grendel",
    type: "lenda",
    origin: "Épica Germânica (Beowulf)",
    period: "Inglaterra anglo-saxã (c. 700–1000)",
    synopsis:
      "Um monstro ataca o salão de Hrothgar há doze anos. Beowulf, um estrangeiro forte, arranca o braço de Grendel com as próprias mãos e depois caça a mãe da criatura no lago. No fim é preciso um jovem contra o dragão — e todos os seus guerreiros fogem.",
    motifs: ["monstro a ser morto", "defesa heroica", "hospitalidade violada", "mortalidade", "traição"],
    archetypes: ["Herói", "Sombra", "Mentor"],
    themes: ["civilização contra o selvagem", "glória de uma mão só", "velhice e a falha final"],
    characters: ["Beowulf", "Grendel", "Hrothgar", "Wiglaf", "A mãe de Grendel", "Unferth"],
  },
  {
    id: "gotterdammerung",
    name: "O Crepúsculo dos Deuses",
    type: "mito",
    origin: "Mitologia Nórdica (Richard Wagner / Eddas)",
    period: "Romantismo alemão (1876) sobre matéria medieval",
    synopsis:
      "O anel forjado do ouro do Reno carrega a maldição da renúncia ao amor. Brünnhilde desafia Wotan e dorme num círculo de fogo; Siegfried a desperta, é traído pela poção do esquecimento e morto. No fim, a valquíria devolve o anel ao rio e o Valhalla arde com os deuses dentro.",
    motifs: ["anel do poder", "maldição", "amor e morte", "esquecimento", "apocalipse", "ragnarök"],
    archetypes: ["Anima/Animus", "Herói Trágico", "Sombra"],
    themes: ["amor contra poder", "fim dos deuses como purificação", "memória perdida como morte em vida"],
    characters: ["Brünnhilde", "Siegfried", "Wotan", "Alberich", "Fafner"],
  },
];
