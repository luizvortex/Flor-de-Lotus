export type Showcase = { slug: string; position: number; title: string; eyebrow: string; description: string; photos: {url: string; alt: string}[]; features: {icon: string; label: string}[]; revision: number };

export const showcaseDefaults: Showcase[] = [
  {
    "slug": "duplo",
    "position": 1,
    "title": "Duplo Twin",
    "eyebrow": "17 m²",
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
        "label": "Wi-Fi rápido para ficar conectado"
      },
      {
        "icon": "tv",
        "label": "Seus streamings favoritos na Smart TV"
      },
      {
        "icon": "snow",
        "label": "Split silencioso para noites tranquilas"
      },
      {
        "icon": "door-open",
        "label": "Sua varanda, sua rede, seu descanso"
      }
    ],
    "revision": 2
  },
  {
    "slug": "triplo",
    "position": 2,
    "title": "Quarto Triplo",
    "eyebrow": "17 m²",
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
        "label": "Conexão Wi-Fi de alta velocidade"
      },
      {
        "icon": "tv",
        "label": "Smart TV para curtir seus streamings"
      },
      {
        "icon": "snow",
        "label": "Clima agradável com Split silencioso"
      },
      {
        "icon": "door-open",
        "label": "Varanda privativa com rede para relaxar"
      }
    ],
    "revision": 2
  },
  {
    "slug": "familia",
    "position": 3,
    "title": "Quarto Família",
    "eyebrow": "17 m²",
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
        "label": "Wi-Fi veloz para toda a família"
      },
      {
        "icon": "tv",
        "label": "Smart TV com acesso aos seus streamings"
      },
      {
        "icon": "snow",
        "label": "Conforto e silêncio com ar Split"
      },
      {
        "icon": "door-open",
        "label": "Uma rede na varanda só de vocês"
      }
    ],
    "revision": 2
  }
];
