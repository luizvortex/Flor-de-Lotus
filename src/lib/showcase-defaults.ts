export type ShowcaseDetails = { beds?: string; description?: string; bathroom?: string[]; views?: string[]; amenities?: string[]; smoking?: string };
export type Showcase = { slug: string; position: number; title: string; eyebrow: string; description: string; photos: {url: string; alt: string}[]; features: {icon: string; label: string}[]; details?: ShowcaseDetails; revision: number };

export const showcaseDefaults: Showcase[] = [
  {
    "slug": "duplo",
    "position": 1,
    "title": "Quarto Duplo Standard",
    "eyebrow": "17 m²",
    "description": "Aconchego para desacelerar depois de um dia em Itacaré. São 17 m² com cama de casal, banheiro privativo e varanda com vista para o jardim — um convite ao descanso.",
    "photos": [
      {
        "url": "/img casal/casal.jpg",
        "alt": "Quarto Duplo Standard — foto 1"
      },
      {
        "url": "/img casal/casal1.jpg",
        "alt": "Quarto Duplo Standard — foto 2"
      },
      {
        "url": "/img casal/casal2.jpg",
        "alt": "Quarto Duplo Standard — foto 3"
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
    "revision": 3,
    "details": {
      "beds": "1 cama de casal",
      "description": "A acomodação oferece produtos de banho gratuitos e banheiro privativo com chuveiro. A varanda tem vista para o jardim, e o quarto conta com ar-condicionado e TV de tela plana.",
      "bathroom": [
        "Produtos de banho gratuitos",
        "Chuveiro",
        "Banheiro privativo",
        "Toalhas",
        "Papel higiênico"
      ],
      "views": [
        "Vista para o jardim"
      ],
      "amenities": [
        "Varanda",
        "Ar-condicionado",
        "Roupa de cama",
        "TV de tela plana"
      ],
      "smoking": "Não é permitido fumar"
    }
  },
  {
    "slug": "triplo",
    "position": 2,
    "title": "Quarto Duplo Superior",
    "eyebrow": "17 m²",
    "description": "Seu descanso com o charme de Itacaré. Em 17 m², a cama de casal, o banheiro privativo e a varanda com vista para o jardim compõem um ambiente acolhedor para aproveitar a estadia.",
    "photos": [
      {
        "url": "/img Pousada/quartotriplo.jpg",
        "alt": "Quarto Duplo Superior — foto 1"
      },
      {
        "url": "/img casal/triplo.jpg",
        "alt": "Quarto Duplo Superior — foto 2"
      },
      {
        "url": "/img casal/triplo1.jpg",
        "alt": "Quarto Duplo Superior — foto 3"
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
    "revision": 3,
    "details": {
      "beds": "1 cama de casal",
      "description": "A acomodação oferece produtos de banho gratuitos e banheiro privativo com chuveiro. A varanda tem vista para o jardim, e o quarto conta com ar-condicionado e TV de tela plana.",
      "bathroom": [
        "Produtos de banho gratuitos",
        "Chuveiro",
        "Banheiro privativo",
        "Toalhas",
        "Papel higiênico"
      ],
      "views": [
        "Vista para o jardim"
      ],
      "amenities": [
        "Varanda",
        "Ar-condicionado",
        "Roupa de cama",
        "TV de tela plana"
      ],
      "smoking": "Não é permitido fumar"
    }
  },
  {
    "slug": "triplo-standard",
    "position": 3,
    "title": "Quarto Triplo Standard",
    "eyebrow": "",
    "description": "Um refúgio acolhedor para compartilhar os dias em Itacaré. O Quarto Triplo Standard é uma opção para quem viaja em três e quer aproveitar a estadia com tranquilidade.",
    "photos": [
      {
        "url": "/img Pousada/quartotriplo.jpg",
        "alt": "Quarto Triplo Standard — foto 1"
      },
      {
        "url": "/img casal/triplo.jpg",
        "alt": "Quarto Triplo Standard — foto 2"
      },
      {
        "url": "/img casal/triplo1.jpg",
        "alt": "Quarto Triplo Standard — foto 3"
      }
    ],
    "features": [
      {
        "icon": "people",
        "label": "Acomodação para três pessoas"
      }
    ],
    "details": {},
    "revision": 1
  },
  {
    "slug": "familia",
    "position": 4,
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
    "revision": 2,
    "details": {
      "beds": "",
      "description": "",
      "bathroom": [],
      "views": [],
      "amenities": [],
      "smoking": ""
    }
  }
];
