window.EMT_CATALOGO = {
  modoPrueba: true,
  ivaIncluido: true,

  empresa: {
    nombre: "EMTECSA",
    lema: "Energía con respaldo",
    telefono: null,
    whatsapp: null,
    correo: null,
    direccion: null
  },

  banco: {
    banco: null,
    tipo: null,
    numero: null,
    nombre: null,
    moneda: "Quetzales"
  },

  lineas: [
    { id: "transformadores", n: "01", nombre: "Transformadores", corto: "Transformadores de media tensión", texto: "Monofásicos tipo poste en 13.2 kV y 34.5 kV, de 10 a 75 kVA. Se arman en banco trifásico cuando la carga lo pide.", foto: "img/transformador-cielo.webp", modelo: "transformador" },
    { id: "postes", n: "02", nombre: "Postes", corto: "Postes de concreto y pino tratado", texto: "Concreto centrifugado y pino tratado, de 30 a 45 pies, para redes de media y baja tensión.", foto: "img/poste-cruceta.webp", modelo: "poste-concreto" },
    { id: "cruceros", n: "03", nombre: "Cruceros", corto: "Crucetas metálicas y de pino", texto: "Crucetas angulares galvanizadas y de pino tratado de 2,400 mm, con sus soportes.", foto: "img/cruceta-aisladores.webp", modelo: "cruceta-metal" },
    { id: "herrajes", n: "04", nombre: "Herrajes", corto: "Pernos, grapas, grilletes y conectores", texto: "Todo lo que sostiene la línea: acero galvanizado en caliente, grapas de aluminio y conectores de cuña.", foto: "img/pernos.webp", modelo: "perno" },
    { id: "aislamiento", n: "05", nombre: "Aislamiento", corto: "Aisladores y protección", texto: "Porcelana tipo poste, composite de suspensión, carretes, cortacircuitos y fusibles tipo K.", foto: "img/aisladores-vidrio.webp", modelo: "aislador-poste" }
  ],

  productos: [
    { id: "tr-mono", linea: "transformadores", nombre: "Transformador monofásico tipo poste", detalle: "Sumergido en aceite, con soporte para poste.", modelo: "transformador", modo: "cotizar",
      opciones: [
        { id: "tension", nombre: "Tensión primaria", valores: ["13.2 kV", "34.5 kV"] },
        { id: "capacidad", nombre: "Capacidad", valores: ["10 kVA", "15 kVA", "25 kVA", "50 kVA", "75 kVA"] }
      ],
      ficha: [["Fases", "Monofásico"], ["Tensión primaria", "13.2 kV o 34.5 kV"], ["Secundario", "120/240 V"], ["Montaje", "Tipo poste"], ["Enfriamiento", "Aceite mineral"]] },
    { id: "tr-banco", linea: "transformadores", nombre: "Banco trifásico de transformadores", detalle: "Tres unidades monofásicas armadas en poste o plataforma.", modelo: "banco", modo: "cotizar",
      opciones: [
        { id: "capacidad", nombre: "Capacidad total", valores: ["3 × 25 kVA", "3 × 50 kVA", "3 × 75 kVA"] }
      ],
      ficha: [["Conexión", "Estrella o delta, según la red"], ["Tensión primaria", "13.2 kV"], ["Incluye", "Herrajes y crucetas de montaje"], ["Instalación", "Montaje, conexión y pruebas"]] },

    { id: "po-concreto", linea: "postes", nombre: "Poste de concreto centrifugado", detalle: "Para redes de media tensión y acometidas.", modelo: "poste-concreto", modo: "cotizar",
      opciones: [{ id: "altura", nombre: "Altura", valores: ["30 pies", "35 pies", "40 pies", "45 pies"] }],
      ficha: [["Material", "Concreto centrifugado"], ["Alturas", "30 a 45 pies"], ["Uso", "Media y baja tensión"], ["Entrega", "En obra, con grúa"]] },
    { id: "po-pino", linea: "postes", nombre: "Poste de pino tratado", detalle: "Tratado contra humedad y polilla.", modelo: "poste-madera", modo: "cotizar",
      opciones: [{ id: "altura", nombre: "Altura", valores: ["30 pies", "35 pies", "40 pies"] }],
      ficha: [["Material", "Pino tratado a presión"], ["Alturas", "30 a 40 pies"], ["Uso", "Baja tensión y alumbrado"]] },

    { id: "cr-metal", linea: "cruceros", nombre: "Cruceta angular metálica 2,400 mm", detalle: "Acero galvanizado en caliente.", modelo: "cruceta-metal", modo: "precio", precio: 485, unidad: "unidad",
      ficha: [["Largo", "2,400 mm"], ["Material", "Ángulo de acero galvanizado"], ["Uso", "Media tensión 13.2 y 34.5 kV"]] },
    { id: "cr-pino", linea: "cruceros", nombre: "Cruceta de pino tratado 2,400 mm", detalle: "Madera tratada a presión.", modelo: "cruceta-madera", modo: "precio", precio: 260, unidad: "unidad",
      ficha: [["Largo", "2,400 mm"], ["Material", "Pino tratado"], ["Uso", "Media y baja tensión"]] },
    { id: "cr-soporte", linea: "cruceros", nombre: "Soporte para transformador tipo poste", detalle: "Para transformador monofásico.", modelo: "soporte", modo: "precio", precio: 340, unidad: "unidad",
      ficha: [["Material", "Acero galvanizado"], ["Uso", "Transformador monofásico tipo poste"]] },

    { id: "he-perno", linea: "herrajes", nombre: "Perno de rosca corrida 5/8 × 12", detalle: "Galvanizado, con tuerca y arandela.", modelo: "perno", modo: "precio", precio: 38, unidad: "unidad",
      ficha: [["Medida", "5/8 × 12 pulgadas"], ["Acabado", "Galvanizado en caliente"]] },
    { id: "he-ojo", linea: "herrajes", nombre: "Tornillo con ojo 5/8 × 12", detalle: "Para retenidas y cadenas de aisladores.", modelo: "tornillo-ojo", modo: "precio", precio: 46, unidad: "unidad",
      ficha: [["Medida", "5/8 × 12 pulgadas"], ["Acabado", "Galvanizado en caliente"]] },
    { id: "he-grillete", linea: "herrajes", nombre: "Grillete recto 5/8", detalle: "Carga de rotura 11,300 kg.", modelo: "grillete", modo: "precio", precio: 52, unidad: "unidad",
      ficha: [["Medida", "5/8 pulgada"], ["Rotura", "11,300 kg"], ["Acabado", "Galvanizado"]] },
    { id: "he-grapa", linea: "herrajes", nombre: "Grapa de suspensión AWG 1/0 Raven", detalle: "Aluminio, para conductor 1/0.", modelo: "grapa", modo: "precio", precio: 145, unidad: "unidad",
      ficha: [["Conductor", "AWG 1/0 Raven"], ["Material", "Aleación de aluminio"]] },
    { id: "he-cuna", linea: "herrajes", nombre: "Conector de cuña 1/0 a 1/0", detalle: "Conexión a presión, sin tornillos.", modelo: "conector", modo: "precio", precio: 68, unidad: "unidad",
      ficha: [["Calibres", "AWG 1/0 a AWG 1/0"], ["Instalación", "Herramienta de disparo"]] },
    { id: "he-pica", linea: "herrajes", nombre: "Pica de puesta a tierra 5/8 × 8'", detalle: "Con conector para cable de cobre.", modelo: "pica", modo: "precio", precio: 95, unidad: "unidad",
      ficha: [["Medida", "5/8 pulgada × 8 pies"], ["Acabado", "Recubrimiento de cobre"]] },

    { id: "ai-poste", linea: "aislamiento", nombre: "Aislador de porcelana tipo poste 13.2 kV", detalle: "ANSI 57-1.", modelo: "aislador-poste", modo: "precio", precio: 165, unidad: "unidad",
      ficha: [["Norma", "ANSI 57-1"], ["Tensión", "13.2 kV"], ["Material", "Porcelana vidriada"]] },
    { id: "ai-suspension", linea: "aislamiento", nombre: "Aislador composite de suspensión 13.2 kV", detalle: "70 kN, para remates.", modelo: "aislador-suspension", modo: "precio", precio: 210, unidad: "unidad",
      ficha: [["Carga", "70 kN"], ["Tensión", "13.2 kV"], ["Material", "Hule silicón y fibra de vidrio"]] },
    { id: "ai-carrete", linea: "aislamiento", nombre: "Aislador carrete ANSI 53-2", detalle: "Para baja tensión.", modelo: "aislador-carrete", modo: "precio", precio: 24, unidad: "unidad",
      ficha: [["Norma", "ANSI 53-2"], ["Material", "Porcelana"]] },
    { id: "ai-corta", linea: "aislamiento", nombre: "Cortacircuitos fusible 15 kV 200 A", detalle: "Base con tubo portafusible.", modelo: "cortacircuitos", modo: "precio", precio: 890, unidad: "unidad",
      ficha: [["Tensión", "15 kV"], ["Corriente", "200 A"], ["Incluye", "Tubo portafusible 100 A"]] },
    { id: "ai-fusible", linea: "aislamiento", nombre: "Fusible tipo K 6 A", detalle: "Para tubo portafusible de expulsión.", modelo: "fusible", modo: "precio", precio: 28, unidad: "unidad",
      ficha: [["Tipo", "K"], ["Corriente", "6 A"]] }
  ],

  obras: [
    { foto: "img/linieros-poste.webp", titulo: "Montaje en poste", texto: "Transformador, cortacircuitos y acometida en un mismo día." },
    { foto: "img/linieros-canastas.webp", titulo: "Línea energizada", texto: "Cuadrillas con canasta y equipo de altura." },
    { foto: "img/transformadores-trio.webp", titulo: "Bancos trifásicos", texto: "Tres unidades conectadas y probadas." },
    { foto: "img/conectores.webp", titulo: "Cada herraje cuenta", texto: "Conectores y tornillería que no se aflojan." },
    { foto: "img/pasatapas.webp", titulo: "Subestaciones", texto: "Aislamiento revisado antes de energizar." }
  ]
};
