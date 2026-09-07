/**
 * Seed do catálogo da loja — popula a tabela `products` no Supabase.
 *
 * Uso (a service_role key ignora a RLS — nunca versione essa chave):
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm --filter @workspace/scripts run seed
 *
 * Idempotente: `on conflict (slug)` — reexecutar não duplica.
 */
import { createClient } from "@supabase/supabase-js";

type Seed = {
  name: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  image: string;
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
};

const IMAGE = (base: string) => `/images/${base}.jpg`;

const PRODUCTS: Seed[] = [
  // ------------------------------------------------------------------ Laptops
  {
    name: "Notebook URB Vortex 14 Core i7 16GB 512GB SSD",
    category: "Laptops",
    description:
      "Ultrabook de 14 polegadas com processador Intel Core i7 de 13ª geração, 16GB de RAM DDR5 e SSD NVMe de 512GB. Tela IPS Full HD com 100% sRGB, teclado retroiluminado e 12h de autonomia.",
    price: 5499.9,
    compareAtPrice: 6299.9,
    stock: 24,
    image: "laptop",
    featured: true,
    rating: 4.8,
    reviewCount: 214,
  },
  {
    name: "Notebook Gamer URB Raptor 15 Ryzen 7 RTX 4060 32GB",
    category: "Laptops",
    description:
      "Máquina para jogos com Ryzen 7, GeForce RTX 4060 8GB, 32GB DDR5 e SSD de 1TB. Painel 15,6\" 165Hz, sistema de dupla ventoinha e iluminação RGB por tecla.",
    price: 8999.9,
    compareAtPrice: 9999.9,
    stock: 11,
    image: "laptop",
    featured: true,
    rating: 4.9,
    reviewCount: 168,
  },
  {
    name: "Notebook URB Air 13 Snapdragon X 16GB 256GB",
    category: "Laptops",
    description:
      "Fino e silencioso, sem ventoinha. Chip ARM Snapdragon X, 16GB de RAM e 20h de bateria. Ideal para produtividade, reuniões e trabalho móvel.",
    price: 4299.9,
    stock: 30,
    image: "laptop",
    rating: 4.6,
    reviewCount: 97,
  },
  {
    name: "Notebook URB Studio 16 Core Ultra 9 RTX 4070 64GB",
    category: "Laptops",
    description:
      "Estação de trabalho móvel para criação 3D, edição 8K e IA local. Core Ultra 9, RTX 4070, 64GB DDR5 e 2TB SSD. Tela OLED 16\" com calibração de fábrica.",
    price: 13999.9,
    compareAtPrice: 15499.9,
    stock: 6,
    image: "laptop",
    featured: true,
    rating: 4.9,
    reviewCount: 74,
  },
  {
    name: "Notebook URB Essential 15 Core i5 8GB 256GB",
    category: "Laptops",
    description:
      "Opção econômica para estudos e tarefas do dia a dia. Core i5, 8GB de RAM, SSD de 256GB e tela antirreflexo de 15,6 polegadas.",
    price: 2799.9,
    compareAtPrice: 3199.9,
    stock: 48,
    image: "laptop",
    rating: 4.4,
    reviewCount: 331,
  },
  {
    name: "Notebook URB Flip 14 2 em 1 Touch Core i7 16GB",
    category: "Laptops",
    description:
      "Conversível com dobradiça 360°, tela sensível ao toque e caneta inclusa. Core i7, 16GB de RAM e SSD de 512GB para usar como notebook ou tablet.",
    price: 6199.9,
    stock: 17,
    image: "laptop",
    rating: 4.7,
    reviewCount: 88,
  },
  {
    name: "Notebook URB Forge 17 Workstation Xeon 64GB RTX A3000",
    category: "Laptops",
    description:
      "Certificado para engenharia e CAD. Tela 17\" DCI-P3, RTX A3000 12GB, 64GB ECC e dois slots SSD. Refrigeração de vapor e portas Thunderbolt 4.",
    price: 18990.0,
    compareAtPrice: 20990.0,
    stock: 4,
    image: "laptop",
    rating: 4.8,
    reviewCount: 41,
  },

  // -------------------------------------------------------------- Smartphones
  {
    name: "Smartphone URB Pulse 5G 256GB Preto Titânio",
    category: "Smartphones",
    description:
      "Tela AMOLED 6,7\" 120Hz, chip octa-core 5G, 256GB de armazenamento e câmera tripla de 50MP com estabilização óptica. Bateria de 5000mAh com carga rápida de 67W.",
    price: 3299.9,
    compareAtPrice: 3799.9,
    stock: 40,
    image: "smartphone",
    featured: true,
    rating: 4.7,
    reviewCount: 512,
  },
  {
    name: "Smartphone URB Pulse Pro 5G 512GB Câmera 200MP",
    category: "Smartphones",
    description:
      "Topo de linha com sensor principal de 200MP, teleobjetiva periscópica 5x, tela LTPO 1-120Hz e resistência IP68. 12GB de RAM e 512GB de espaço.",
    price: 5999.9,
    compareAtPrice: 6799.9,
    stock: 18,
    image: "smartphone",
    featured: true,
    rating: 4.9,
    reviewCount: 287,
  },
  {
    name: "Smartphone URB Lite 128GB Azul",
    category: "Smartphones",
    description:
      "Custo-benefício com tela de 6,6\", bateria de 5000mAh que dura dois dias, câmera dupla de 50MP e leitor de digital lateral. 128GB expansíveis por microSD.",
    price: 1299.9,
    compareAtPrice: 1599.9,
    stock: 75,
    image: "smartphone",
    rating: 4.4,
    reviewCount: 903,
  },
  {
    name: "Smartphone URB Fold Dobrável 5G 512GB",
    category: "Smartphones",
    description:
      "Tela interna flexível de 7,6\" que abre como um tablet e tela externa de 6,2\". Dobradiça testada para 400 mil ciclos, multitarefa com três apps e S-Pen compatível.",
    price: 10999.9,
    stock: 7,
    image: "smartphone",
    featured: true,
    rating: 4.6,
    reviewCount: 63,
  },
  {
    name: "Smartphone URB Play 5G 256GB Gaming Edition",
    category: "Smartphones",
    description:
      "Feito para jogos: tela 165Hz, gatilhos capacitivos, sistema de resfriamento ativo e bateria de 6000mAh com carga de 100W. RAM de 16GB.",
    price: 3899.9,
    compareAtPrice: 4499.9,
    stock: 22,
    image: "smartphone",
    rating: 4.7,
    reviewCount: 149,
  },
  {
    name: "Smartphone URB Mini 5G 256GB Compacto",
    category: "Smartphones",
    description:
      "Para quem prefere aparelhos menores: 5,9\" de tela, desempenho de topo, câmera de 50MP e bateria que encara o dia todo. Cabe em qualquer bolso.",
    price: 2999.9,
    stock: 26,
    image: "smartphone",
    rating: 4.5,
    reviewCount: 118,
  },
  {
    name: "Smartphone URB Go 64GB Entrada",
    category: "Smartphones",
    description:
      "Primeiro celular ou aparelho reserva. Tela de 6,5\", Android limpo, câmera de 13MP e bateria de 5000mAh. Dual SIM e rádio FM.",
    price: 749.9,
    compareAtPrice: 899.9,
    stock: 120,
    image: "smartphone",
    rating: 4.2,
    reviewCount: 640,
  },

  // ------------------------------------------------------------------ Tablets
  {
    name: "Tablet URB Tab S 11 128GB Wi-Fi + Teclado",
    category: "Tablets",
    description:
      "Tela LCD 11\" 90Hz, 8GB de RAM, 128GB de espaço e som estéreo quádruplo. Acompanha capa-teclado magnética e suporte a caneta ativa.",
    price: 2499.9,
    compareAtPrice: 2999.9,
    stock: 33,
    image: "tablet",
    featured: true,
    rating: 4.6,
    reviewCount: 176,
  },
  {
    name: "Tablet URB Tab Ultra 14 OLED 256GB 5G",
    category: "Tablets",
    description:
      "Painel OLED de 14,6\" 120Hz para desenho e edição, 12GB de RAM, conexão 5G e bateria de 11200mAh. Caneta com 4096 níveis de pressão inclusa.",
    price: 6499.9,
    stock: 9,
    image: "tablet",
    featured: true,
    rating: 4.8,
    reviewCount: 84,
  },
  {
    name: "Tablet URB Tab A 10 64GB",
    category: "Tablets",
    description:
      "Ideal para consumo de vídeo e leitura. Tela de 10,1\", controle parental, modo infantil e bateria de longa duração. 64GB expansíveis.",
    price: 1199.9,
    compareAtPrice: 1499.9,
    stock: 54,
    image: "tablet",
    rating: 4.3,
    reviewCount: 298,
  },
  {
    name: "Tablet URB Tab Kids 8 32GB com Capa Antichoque",
    category: "Tablets",
    description:
      "Projetado para crianças: capa emborrachada com alça, filtro de luz azul, conteúdo educativo e limite de tempo de tela. Garantia estendida contra quedas.",
    price: 899.9,
    stock: 61,
    image: "tablet",
    rating: 4.5,
    reviewCount: 205,
  },

  // ------------------------------------------------------------------ Câmeras
  {
    name: "Câmera Mirrorless URB M50 24MP + Lente 18-55mm",
    category: "Câmeras",
    description:
      "Sensor APS-C de 24,2MP, vídeo 4K30, estabilização no corpo e visor eletrônico OLED. Kit com lente 18-55mm f/3.5-5.6 e bateria extra.",
    price: 4599.9,
    compareAtPrice: 5299.9,
    stock: 15,
    image: "camera",
    featured: true,
    rating: 4.8,
    reviewCount: 132,
  },
  {
    name: "Câmera Full Frame URB Pro R6 II Corpo",
    category: "Câmeras",
    description:
      "Sensor full frame de 24MP, 40 fps em rajada eletrônica, autofoco com detecção de olhos e vídeo 6K RAW. Corpo com vedação contra intempéries.",
    price: 14990.0,
    stock: 5,
    image: "camera",
    featured: true,
    rating: 4.9,
    reviewCount: 58,
  },
  {
    name: "Câmera de Ação URB GoWave 5K À Prova d'Água",
    category: "Câmeras",
    description:
      "Grava em 5K60, estabilização eletrônica de última geração, à prova d'água até 10m sem caixa e tela frontal para vlogs. Kit com dois clipes e bateria.",
    price: 2199.9,
    compareAtPrice: 2599.9,
    stock: 28,
    image: "camera",
    rating: 4.6,
    reviewCount: 241,
  },
  {
    name: "Kit Câmera de Segurança URB Guard 3 Unidades 2K",
    category: "Câmeras",
    description:
      "Três câmeras Wi-Fi 2K com visão noturna colorida, detecção de pessoas por IA, sirene integrada e armazenamento local + nuvem. Instalação sem fios.",
    price: 1499.9,
    stock: 37,
    image: "camera",
    rating: 4.4,
    reviewCount: 189,
  },

  // -------------------------------------------------------------------- Áudio
  {
    name: "Fone URB Wave Pro ANC Bluetooth Over-Ear",
    category: "Áudio",
    description:
      "Cancelamento de ruído adaptativo, 40h de bateria, drivers de 40mm e áudio espacial com rastreamento de cabeça. Dobrável, com estojo rígido.",
    price: 1299.9,
    compareAtPrice: 1699.9,
    stock: 44,
    image: "headphones",
    featured: true,
    rating: 4.8,
    reviewCount: 376,
  },
  {
    name: "Fone URB Buds 3 TWS com ANC",
    category: "Áudio",
    description:
      "Intra-auriculares sem fio com cancelamento de ruído, resistência IPX5, carga sem fio e 30h totais com o estojo. Modo transparência e baixa latência para jogos.",
    price: 549.9,
    compareAtPrice: 749.9,
    stock: 90,
    image: "headphones",
    featured: true,
    rating: 4.6,
    reviewCount: 812,
  },
  {
    name: "Caixa de Som URB Boom XL Bluetooth 80W",
    category: "Áudio",
    description:
      "Som estéreo de 80W com graves reforçados, à prova d'água IP67, 24h de bateria e função power bank. Pareie duas unidades para som estéreo real.",
    price: 999.9,
    compareAtPrice: 1249.9,
    stock: 31,
    image: "speaker",
    featured: true,
    rating: 4.7,
    reviewCount: 258,
  },
  {
    name: "Caixa de Som Portátil URB Go Mini 20W",
    category: "Áudio",
    description:
      "Compacta e resistente, com alça de silicone, 12h de bateria, IP67 e microfone para chamadas. Cores vibrantes e som surpreendente para o tamanho.",
    price: 299.9,
    stock: 120,
    image: "speaker",
    rating: 4.5,
    reviewCount: 494,
  },
  {
    name: "Soundbar URB Cinema 3.1 com Subwoofer Sem Fio",
    category: "Áudio",
    description:
      "Barra de som 3.1 canais com Dolby Atmos, subwoofer sem fio de 8\", HDMI eARC e modos de equalização. Transforma a TV em home theater.",
    price: 1899.9,
    compareAtPrice: 2299.9,
    stock: 19,
    image: "speaker",
    rating: 4.7,
    reviewCount: 143,
  },
  {
    name: "Fone URB Studio Monitor Cabo P2/P10",
    category: "Áudio",
    description:
      "Fone de referência para produção musical, resposta plana de 5Hz a 40kHz, concha fechada e almofadas de veludo substituíveis. Cabo destacável com adaptadores.",
    price: 799.9,
    stock: 26,
    image: "headphones",
    rating: 4.8,
    reviewCount: 97,
  },
  {
    name: "Fone URB Sport Open-Ear Condução Óssea",
    category: "Áudio",
    description:
      "Não tampa o ouvido: ideal para correr no trânsito com segurança. Resistente a suor IP55, 8h de bateria e ajuste de titânio flexível.",
    price: 649.9,
    compareAtPrice: 849.9,
    stock: 52,
    image: "headphones",
    rating: 4.4,
    reviewCount: 168,
  },

  // --------------------------------------------------------------- Monitores
  {
    name: "Monitor URB View 27 QHD IPS 165Hz",
    category: "Monitores",
    description:
      "27 polegadas 2560x1440, painel IPS de 165Hz com 1ms, 99% sRGB e HDR400. Ajuste de altura, pivô e entradas DisplayPort + 2x HDMI.",
    price: 1799.9,
    compareAtPrice: 2199.9,
    stock: 34,
    image: "monitor",
    featured: true,
    rating: 4.7,
    reviewCount: 221,
  },
  {
    name: "Monitor Gamer URB Rush 24 Full HD 180Hz",
    category: "Monitores",
    description:
      "24,5\" Fast IPS 180Hz, sincronismo adaptativo, tempo de resposta de 0,5ms GtG e modo de mira. Base compacta que sobra espaço na mesa.",
    price: 1099.9,
    compareAtPrice: 1399.9,
    stock: 47,
    image: "monitor",
    featured: true,
    rating: 4.6,
    reviewCount: 305,
  },
  {
    name: "Monitor URB UltraWide 34 WQHD Curvo 144Hz",
    category: "Monitores",
    description:
      "Curvatura 1500R, 3440x1440, 144Hz e cobertura DCI-P3 de 98%. KVM integrado e USB-C com 90W para trabalhar e jogar em uma tela só.",
    price: 3499.9,
    stock: 12,
    image: "monitor",
    featured: true,
    rating: 4.8,
    reviewCount: 118,
  },
  {
    name: "Monitor URB Creator 32 4K IPS Calibrado",
    category: "Monitores",
    description:
      "32\" UHD 4K com fábrica calibrada Delta-E < 2, 100% Adobe RGB, HDR600 e hub USB-C. Para fotografia, edição de vídeo e design.",
    price: 4299.9,
    compareAtPrice: 4899.9,
    stock: 8,
    image: "monitor",
    rating: 4.8,
    reviewCount: 76,
  },
  {
    name: "Monitor URB Office 24 Full HD 75Hz",
    category: "Monitores",
    description:
      "Econômico para escritório e estudo. IPS Full HD, 75Hz, luz azul reduzida sem cintilação e moldura fina. VESA e HDMI + VGA.",
    price: 699.9,
    compareAtPrice: 899.9,
    stock: 88,
    image: "monitor",
    rating: 4.4,
    reviewCount: 412,
  },

  // ------------------------------------------------------------------ Gaming
  {
    name: "Console URB Station 5 1TB Edição Slim",
    category: "Gaming",
    description:
      "Geração atual com SSD de 1TB, ray tracing, saída 4K120 e 8K. Acompanha controle sem fio com gatilhos adaptativos e retorno tátil.",
    price: 3799.9,
    compareAtPrice: 4299.9,
    stock: 20,
    image: "console",
    featured: true,
    rating: 4.9,
    reviewCount: 640,
  },
  {
    name: "Console Portátil URB Deck 512GB OLED",
    category: "Gaming",
    description:
      "PC de mão para jogos com tela OLED HDR de 7,4\", 512GB, Wi-Fi 6E e até 12h de bateria. Roda sua biblioteca inteira na palma da mão.",
    price: 4199.9,
    stock: 14,
    image: "console",
    featured: true,
    rating: 4.7,
    reviewCount: 203,
  },
  {
    name: "Console URB Cube Series X 1TB",
    category: "Gaming",
    description:
      "12 teraflops, SSD NVMe de 1TB com expansão, Quick Resume e retrocompatibilidade com quatro gerações. Assinatura de jogos com 1 mês incluso.",
    price: 3999.9,
    compareAtPrice: 4499.9,
    stock: 16,
    image: "console",
    featured: true,
    rating: 4.8,
    reviewCount: 289,
  },
  {
    name: "Controle URB Elite Pro Sem Fio com Paddles",
    category: "Gaming",
    description:
      "Botões traseiros programáveis, gatilhos com curso ajustável, sticks intercambiáveis e perfis salvos no controle. Estojo e base de recarga inclusos.",
    price: 899.9,
    compareAtPrice: 1099.9,
    stock: 38,
    image: "console",
    rating: 4.6,
    reviewCount: 154,
  },
  {
    name: "Cadeira Gamer URB Throne Ergonômica Reclinável",
    category: "Gaming",
    description:
      "Encosto reclinável até 155°, apoio lombar e de pescoço em memória, braços 4D e cilindro classe 4. Suporta até 150kg.",
    price: 1599.9,
    compareAtPrice: 1999.9,
    stock: 22,
    image: "keyboard",
    rating: 4.5,
    reviewCount: 331,
  },
  {
    name: "Volante URB Race GT Force Feedback + Pedais",
    category: "Gaming",
    description:
      "Force feedback por engrenagem, giro de 900°, câmbio borboleta e base de pedais com três pedais ajustáveis. Compatível com PC e consoles.",
    price: 2299.9,
    stock: 9,
    image: "console",
    rating: 4.7,
    reviewCount: 87,
  },

  // --------------------------------------------------------------- Wearables
  {
    name: "Smartwatch URB Watch 5 GPS Tela AMOLED",
    category: "Wearables",
    description:
      "Tela AMOLED sempre ligada, GPS duplo, ECG, SpO2 e mais de 100 modos esportivos. Bateria de 7 dias e resistência 5ATM.",
    price: 1499.9,
    compareAtPrice: 1899.9,
    stock: 41,
    image: "smartwatch",
    featured: true,
    rating: 4.7,
    reviewCount: 358,
  },
  {
    name: "Smartwatch URB Watch Ultra Titânio 100m",
    category: "Wearables",
    description:
      "Caixa de titânio de 49mm, vidro de safira, GPS de precisão dupla frequência, mergulho até 100m e botão de ação configurável. Até 3 dias de uso intenso.",
    price: 3999.9,
    stock: 13,
    image: "smartwatch",
    featured: true,
    rating: 4.8,
    reviewCount: 124,
  },
  {
    name: "Pulseira Fitness URB Band 8",
    category: "Wearables",
    description:
      "Monitor de sono, frequência cardíaca e estresse, 14 dias de bateria e tela AMOLED de 1,6\". À prova d'água para nadar. Mais de 120 modos de treino.",
    price: 299.9,
    compareAtPrice: 399.9,
    stock: 110,
    image: "smartwatch",
    rating: 4.5,
    reviewCount: 967,
  },
  {
    name: "Smartwatch URB Kids GPS com Chamada 4G",
    category: "Wearables",
    description:
      "Relógio infantil com localização em tempo real, chamada de voz e vídeo 4G, botão SOS e cerca virtual. Lista de contatos controlada pelos pais.",
    price: 599.9,
    stock: 46,
    image: "smartwatch",
    rating: 4.3,
    reviewCount: 178,
  },

  // -------------------------------------------------------------- Periféricos
  {
    name: "Teclado Mecânico URB Type K8 Sem Fio Hot-Swap",
    category: "Periféricos",
    description:
      "Layout 75%, switches hot-swappable, conexão tripla (2,4GHz/Bluetooth/USB-C), estrutura de alumínio e keycaps PBT. Iluminação RGB por tecla.",
    price: 649.9,
    compareAtPrice: 849.9,
    stock: 57,
    image: "keyboard",
    featured: true,
    rating: 4.8,
    reviewCount: 402,
  },
  {
    name: "Mouse URB Glide Pro Sem Fio 26K DPI 60g",
    category: "Periféricos",
    description:
      "Sensor óptico de 26.000 DPI, 60g, switches ópticos de 90M de cliques e polling de 4000Hz com dongle. Até 90h de bateria.",
    price: 449.9,
    compareAtPrice: 599.9,
    stock: 63,
    image: "speaker",
    featured: true,
    rating: 4.7,
    reviewCount: 276,
  },
  {
    name: "Kit Teclado + Mouse URB Office Combo Sem Fio",
    category: "Periféricos",
    description:
      "Combo silencioso para trabalho: teclado com apoio de palma, mouse ambidestro e um único receptor USB. Pilhas com autonomia de 24 meses.",
    price: 229.9,
    stock: 140,
    image: "keyboard",
    rating: 4.4,
    reviewCount: 588,
  },
  {
    name: "Webcam URB Stream 4K com Tampa de Privacidade",
    category: "Periféricos",
    description:
      "Sensor 4K com HDR, foco automático, dois microfones com redução de ruído e correção de luz. Campo de visão ajustável 65°/78°/90°.",
    price: 549.9,
    compareAtPrice: 699.9,
    stock: 35,
    image: "camera",
    rating: 4.6,
    reviewCount: 194,
  },
  {
    name: "Microfone URB Cast USB Condensador com Braço",
    category: "Periféricos",
    description:
      "Cápsula cardioide de 25mm, monitoramento sem latência, botão de mudo tátil e ganho no corpo. Acompanha braço articulado e filtro pop.",
    price: 699.9,
    stock: 28,
    image: "speaker",
    rating: 4.7,
    reviewCount: 133,
  },
  {
    name: "Mousepad URB Deck XXL Speed 900x400mm",
    category: "Periféricos",
    description:
      "Superfície de tecido de baixa fricção, base emborrachada antiderrapante e bordas costuradas. Cobre teclado e mouse com folga.",
    price: 129.9,
    compareAtPrice: 179.9,
    stock: 200,
    image: "keyboard",
    rating: 4.6,
    reviewCount: 741,
  },

  // --------------------------------------------------------------- Acessórios
  {
    name: "Carregador URB GaN 100W 3 Portas USB-C",
    category: "Acessórios",
    description:
      "Tecnologia GaN compacta que carrega notebook, tablet e celular ao mesmo tempo. Duas USB-C PD e uma USB-A, com proteção térmica.",
    price: 279.9,
    compareAtPrice: 349.9,
    stock: 95,
    image: "speaker",
    featured: true,
    rating: 4.7,
    reviewCount: 322,
  },
  {
    name: "Power Bank URB Charge 20000mAh 30W com Visor",
    category: "Acessórios",
    description:
      "Bateria portátil de 20000mAh, saída de 30W PD, visor digital de porcentagem e recarga rápida do próprio power bank. Carrega o celular ~4 vezes.",
    price: 249.9,
    compareAtPrice: 329.9,
    stock: 130,
    image: "speaker",
    rating: 4.6,
    reviewCount: 505,
  },
  {
    name: "SSD Externo URB Rocket 1TB USB-C 1050MB/s",
    category: "Acessórios",
    description:
      "Do tamanho de um cartão de crédito, leitura de até 1050MB/s, corpo de alumínio com dissipação e resistência a quedas de 2m. Cabo USB-C e USB-A inclusos.",
    price: 599.9,
    compareAtPrice: 799.9,
    stock: 42,
    image: "console",
    featured: true,
    rating: 4.8,
    reviewCount: 217,
  },
  {
    name: "Hub URB Link 9 em 1 USB-C HDMI 4K + Ethernet",
    category: "Acessórios",
    description:
      "Adaptador com HDMI 4K60, 3x USB-A, USB-C PD 100W, leitor SD/microSD e Ethernet gigabit. Ideal para notebooks finos e tablets.",
    price: 329.9,
    stock: 68,
    image: "keyboard",
    rating: 4.5,
    reviewCount: 261,
  },
  {
    name: "Suporte URB Ergo para Notebook em Alumínio",
    category: "Acessórios",
    description:
      "Eleva a tela à altura dos olhos, dobrável para levar na mochila, com ventilação aberta e apoios de silicone. Suporta notebooks de 10\" a 17\".",
    price: 159.9,
    compareAtPrice: 219.9,
    stock: 115,
    image: "keyboard",
    rating: 4.6,
    reviewCount: 389,
  },
];

const DIACRITICS = /[̀-ͯ]/g;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const rows = PRODUCTS.map((p, index) => ({
    name: p.name,
    slug: `${slugify(p.name)}-${index + 1}`,
    description: p.description,
    category: p.category,
    price: p.price,
    compare_at_price: p.compareAtPrice ?? null,
    stock: p.stock,
    image_url: IMAGE(p.image),
    featured: p.featured ?? false,
    rating: p.rating ?? 4.8,
    review_count: p.reviewCount ?? 0,
  }));

  const { error } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
  if (error) {
    console.error(error);
    process.exit(1);
  }

  const byCategory = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`✓ ${rows.length} produtos enviados (novos inseridos, duplicados ignorados).`);
  console.table(byCategory);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
