export type Showcase = { slug: string; position: number; title: string; eyebrow: string; description: string; photos: {url: string; alt: string}[]; features: {icon: string; label: string}[]; revision: number };

export const showcaseDefaults: Showcase[] = [
  {
    "slug": "duplo",
    "position": 1,
    "title": "Duplo Twin",
    "eyebrow": "",
    "description": "Perfeito para amigos ou casais que buscam praticidade. Este quarto oferece o conforto essencial com um toque de charme baiano, garantindo noites tranquilas após um longo dia de praia e passeios em Itacaré.",
    "photos": [
      {
        "url": "/img casal/casal.jpg",
        "alt": "Duplo Twin — foto 1"
      },
      {
        "url": "/img casal/casal1.jpg",
        "alt": "Duplo Twin — foto 2"
      },
      {
        "url": "/img casal/casal2.jpg",
        "alt": "Duplo Twin — foto 3"
      }
    ],
    "features": [
      {
        "icon": "wifi",
        "label": "Wi-Fi de alta velocidade"
      },
      {
        "icon": "tv",
        "label": "Smart TV com acesso a streaming"
      },
      {
        "icon": "snow",
        "label": "Ar-condicionado Split silencioso"
      },
      {
        "icon": "door-open",
        "label": "Varanda privativa com rede"
      }
    ],
    "revision": 1
  },
  {
    "slug": "triplo",
    "position": 2,
    "title": "Quarto Triplo",
    "eyebrow": "",
    "description": "Acomodação espaçosa ideal para pequenos grupos ou famílias. Desfrute de um ambiente arejado e bem iluminado, decorado para proporcionar a máxima sensação de relaxamento e acolhimento.",
    "photos": [
      {
        "url": "/img Pousada/quartotriplo.jpg",
        "alt": "Quarto Triplo — foto 1"
      },
      {
        "url": "/img casal/triplo.jpg",
        "alt": "Quarto Triplo — foto 2"
      },
      {
        "url": "/img casal/triplo1.jpg",
        "alt": "Quarto Triplo — foto 3"
      }
    ],
    "features": [
      {
        "icon": "wifi",
        "label": "Wi-Fi de alta velocidade"
      },
      {
        "icon": "tv",
        "label": "Smart TV de ecrã plano"
      },
      {
        "icon": "snow",
        "label": "Ar-condicionado Split"
      },
      {
        "icon": "cup-hot",
        "label": "Frigobar abastecido"
      }
    ],
    "revision": 1
  },
  {
    "slug": "familia",
    "position": 3,
    "title": "Quarto Família",
    "eyebrow": "",
    "description": "A melhor escolha para quem viaja com toda a família. Amplo espaço interno garantindo conforto para adultos e crianças, com todas as comodidades necessárias para se sentirem em casa.",
    "photos": [
      {
        "url": "/img Pousada/FlordeLotus8.jpg",
        "alt": "Quarto Família — foto 1"
      },
      {
        "url": "/img Pousada/FlordeLotus8.jpg",
        "alt": "Quarto Família — foto 2"
      },
      {
        "url": "/img Pousada/FlordeLotus8.jpg",
        "alt": "Quarto Família — foto 3"
      }
    ],
    "features": [
      {
        "icon": "wifi",
        "label": "Wi-Fi de alta velocidade"
      },
      {
        "icon": "tv",
        "label": "Smart TV com canais infantis"
      },
      {
        "icon": "snow",
        "label": "Ar-condicionado Split potente"
      },
      {
        "icon": "shield-check",
        "label": "Cofre eletrônico"
      }
    ],
    "revision": 1
  }
];
