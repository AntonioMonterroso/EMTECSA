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
    { id: "transformadores", n: "01", nombre: "Transformadores", corto: "Transformadores de media tensión", texto: "Monofásicos tipo poste en 13.2 kV y 34.5 kV, de 10 a 75 kVA.", foto: "img/transformador-cielo.webp", modelo: "transformador" },
    { id: "cruceros", n: "02", nombre: "Cruceros", corto: "Crucetas, protectores y soportes", texto: "Cruceta angular galvanizada de 2,400 mm, protector de pino tratado y soportes para transformador, seccionador y aisladores.", foto: "img/cruceta-aisladores.webp", modelo: "cruceta-metal" },
    { id: "herrajes", n: "03", nombre: "Herrajes", corto: "Pernos, tornillos, grapas y retenciones", texto: "Pernos, tornillos, tuercas, arandelas, grilletes, grapas de aluminio y retenciones preformadas.", foto: "img/pernos.webp", modelo: "perno" },
    { id: "aislamiento", n: "04", nombre: "Aislamiento", corto: "Aisladores y protección", texto: "Porcelana tipo poste y carrete, composite de suspensión, cortacircuitos, tubos portafusible y fusibles tipo K.", foto: "img/aisladores-vidrio.webp", modelo: "aislador-poste" },
    { id: "conexion", n: "05", nombre: "Conductores y conexión", corto: "Conductores, conectores y puesta a tierra", texto: "Triplex de aluminio, cobre para tierra, conectores de cuña, cargas Ampact, terminales y picas.", foto: "img/poste-cruceta.webp", modelo: "conector" }
  ],

  productos: [
    {id: "tr-mono", linea: "transformadores", nombre: "Transformador monofásico tipo poste", detalle: "Sumergido en aceite, listo para montar en poste.", modelo: "transformador", modo: "cotizar", codigos: ["MAT-056", "MAT-057", "MAT-058", "MAT-059", "MAT-060", "MAT-061", "MAT-062", "MAT-063", "MAT-064", "MAT-065"], opciones: [{id: "tension", nombre: "Tensión primaria", valores: ["13.2 kV", "34.5 kV"]}, {id: "capacidad", nombre: "Capacidad", valores: ["10 kVA", "15 kVA", "25 kVA", "50 kVA", "75 kVA"]}], ficha: [["Fases", "Monofásico"], ["Tensión primaria", "13.2 kV o 34.5 kV"], ["Capacidad", "10 a 75 kVA"], ["Montaje", "Tipo poste"]]},
    {id: "cr-metal", linea: "cruceros", nombre: "Cruceta angular metálica 2,400 mm", detalle: "Ángulo de acero galvanizado.", modelo: "cruceta-metal", modo: "cotizar", codigos: ["MAT-026"], ficha: [["Largo", "2,400 mm"], ["Material", "Acero galvanizado"], ["Uso", "Media tensión"]]},
    {id: "cr-protector", linea: "cruceros", nombre: "Protector de pino tratado 2,400 mm", detalle: "Madera tratada a presión.", modelo: "cruceta-madera", modo: "cotizar", codigos: ["MAT-038"], ficha: [["Largo", "2,400 mm"], ["Material", "Pino tratado"]]},
    {id: "cr-soporte", linea: "cruceros", nombre: "Soporte para poste", detalle: "Para transformador, seccionador o aisladores.", modelo: "soporte", modo: "cotizar", codigos: ["MAT-046", "MAT-045", "MAT-047", "MAT-044"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Transformador monofásico", "Seccionador fusible", "Vertical de chapa para aislador tipo poste", "Horquilla para aislador carrete"]}], ficha: [["Material", "Acero galvanizado"], ["Montaje", "En poste"]]},
    {id: "he-perno", linea: "herrajes", nombre: "Perno galvanizado", detalle: "Acero galvanizado en caliente.", modelo: "perno", modo: "cotizar", codigos: ["MAT-036", "MAT-035"], opciones: [{id: "medida", nombre: "Medida", valores: ["Rosca corrida 5/8 × 12", "Corto 3/4 × 3"]}], ficha: [["Acabado", "Galvanizado"]]},
    {id: "he-tornillo", linea: "herrajes", nombre: "Tornillo galvanizado", detalle: "Con ojo o de cabeza, en varias medidas.", modelo: "tornillo-ojo", modo: "cotizar", codigos: ["MAT-051", "MAT-055", "MAT-052", "MAT-054", "MAT-053"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Con ojo 5/8 × 12", "Con ojo 5/8 × 14", "De cabeza 5/8 × 12", "De cabeza 5/8 × 14", "De cabeza 5/8 × 1-3/4"]}], ficha: [["Diámetro", "5/8"], ["Acabado", "Galvanizado"]]},
    {id: "he-tuerca", linea: "herrajes", nombre: "Tuerca galvanizada 5/8", detalle: "Hexagonal o de ojo.", modelo: "perno", modo: "cotizar", codigos: ["MAT-069", "MAT-068"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Hexagonal", "De ojo"]}], ficha: [["Diámetro", "5/8"], ["Acabado", "Galvanizado"]]},
    {id: "he-arandela", linea: "herrajes", nombre: "Arandela", detalle: "Plana, de presión o curva cuadrada.", modelo: "perno", modo: "cotizar", codigos: ["MAT-009", "MAT-008", "MAT-007"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Plana redonda 5/8", "De presión 5/8", "Curva cuadrada 2-1/4 × 2-1/4 × 3/16"]}], ficha: [["Acabado", "Galvanizado"]]},
    {id: "he-grillete", linea: "herrajes", nombre: "Grillete largo recto 5/8", detalle: "Para cadenas de aisladores y retenidas.", modelo: "grillete", modo: "cotizar", codigos: ["MAT-033"], ficha: [["Medida", "5/8"], ["Carga", "11,300 kg"]]},
    {id: "he-alargadera", linea: "herrajes", nombre: "Alargadera para cadena de aisladores", detalle: "Da el largo que pide la cadena.", modelo: "grillete", modo: "cotizar", codigos: ["MAT-006"], ficha: [["Uso", "Cadena de aisladores de suspensión"]]},
    {id: "he-grapa-susp", linea: "herrajes", nombre: "Grapa de suspensión de aluminio", detalle: "Sostiene el conductor sobre el aislador.", modelo: "grapa", modo: "cotizar", codigos: ["MAT-032", "MAT-031"], opciones: [{id: "conductor", nombre: "Conductor", valores: ["AWG 1/0 Raven", "AWG 4/0 – MCM 266"]}], ficha: [["Material", "Aluminio"]]},
    {id: "he-grapa-amarre", linea: "herrajes", nombre: "Grapa de amarre de aluminio", detalle: "Remata el conductor en el poste.", modelo: "grapa", modo: "cotizar", codigos: ["MAT-029", "MAT-028"], opciones: [{id: "conductor", nombre: "Conductor", valores: ["AWG 1/0 Raven", "AWG 4/0 – MCM 266"]}], ficha: [["Material", "Aluminio"]]},
    {id: "he-retencion", linea: "herrajes", nombre: "Retención preformada", detalle: "Omega o Z, según el aislador y el conductor.", modelo: "grapa", modo: "cotizar", codigos: ["MAT-039", "MAT-040", "MAT-041", "MAT-042", "MAT-043"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Omega doble, aislador 57/1-3, ACSR 1/0", "Omega doble, aislador 57/1-3, ACSR 4/0", "Omega, aislador 53/2, ACSR 1/0", "Z, aislador 57/1-3, ACSR 1/0", "Z, aislador 57/1-3, ACSR 4/0"]}], ficha: [["Conductor", "ACSR 1/0 o 4/0"]]},
    {id: "he-cinta", linea: "herrajes", nombre: "Cinta de acero para poste", detalle: "Cinta galvanizada y su hebilla.", modelo: "grapa", modo: "cotizar", codigos: ["MAT-014", "MAT-034"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Cinta galvanizada 3/8 × 0.025", "Hebilla de acero inoxidable 3/8"]}], ficha: [["Ancho", "3/8 de pulgada"]]},
    {id: "ai-poste", linea: "aislamiento", nombre: "Aislador de porcelana tipo poste", detalle: "Para 13.2 o 34.5 kV.", modelo: "aislador-poste", modo: "cotizar", codigos: ["MAT-003", "MAT-004"], opciones: [{id: "tension", nombre: "Tensión", valores: ["13.2 kV (ANSI 57-1)", "34.5 kV (ANSI 57-3)"]}], ficha: [["Material", "Porcelana"]]},
    {id: "ai-suspension", linea: "aislamiento", nombre: "Aislador composite de suspensión 70 kN", detalle: "Liviano y resistente a la intemperie.", modelo: "aislador-suspension", modo: "cotizar", codigos: ["MAT-001", "MAT-002"], opciones: [{id: "tension", nombre: "Tensión", valores: ["13.2 kV", "34.5 kV"]}], ficha: [["Material", "Composite"], ["Carga", "70 kN"]]},
    {id: "ai-carrete", linea: "aislamiento", nombre: "Aislador de porcelana carrete", detalle: "Para baja tensión y retenidas.", modelo: "aislador-carrete", modo: "cotizar", codigos: ["MAT-005"], ficha: [["Material", "Porcelana"], ["Norma", "ANSI 53-2"]]},
    {id: "ai-corta", linea: "aislamiento", nombre: "Base de cortacircuitos fusible 200 A", detalle: "Protege el transformador y la línea.", modelo: "cortacircuitos", modo: "cotizar", codigos: ["MAT-010", "MAT-011"], opciones: [{id: "tension", nombre: "Tensión", valores: ["15 kV", "36 kV"]}], ficha: [["Corriente", "200 A"]]},
    {id: "ai-tubo", linea: "aislamiento", nombre: "Tubo portafusible de expulsión 100 A", detalle: "Para la base de cortacircuitos.", modelo: "fusible", modo: "cotizar", codigos: ["MAT-066", "MAT-067"], opciones: [{id: "tension", nombre: "Tensión", valores: ["15 kV", "36 kV"]}], ficha: [["Corriente", "100 A"]]},
    {id: "ai-fusible", linea: "aislamiento", nombre: "Fusible tipo K 6 A", detalle: "Para tubo portafusible de expulsión.", modelo: "fusible", modo: "cotizar", codigos: ["MAT-027"], ficha: [["Tipo", "K"], ["Corriente", "6 A"]]},
    {id: "co-triplex", linea: "conexion", nombre: "Conductor trenzado triplex 600 V", detalle: "Aluminio, para acometidas y baja tensión.", modelo: "conector", modo: "cotizar", codigos: ["MAT-016", "MAT-015"], opciones: [{id: "calibre", nombre: "Calibre", valores: ["1/0 AAC – 1/0 AAAC", "4/0 AAC – 4/0 AAAC"]}], ficha: [["Tensión", "600 V"], ["Material", "Aluminio AAC y AAAC"]]},
    {id: "co-tierra", linea: "conexion", nombre: "Conductor No. 2 AWG para puesta a tierra", detalle: "Cobre desnudo o copperweld.", modelo: "pica", modo: "cotizar", codigos: ["MAT-017", "MAT-018"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Cobre desnudo 7 hilos", "Copperweld"]}], ficha: [["Calibre", "No. 2 AWG"]]},
    {id: "co-cuna", linea: "conexion", nombre: "Conector de cuña a presión", detalle: "Une conductores sin aflojarse.", modelo: "conector", modo: "cotizar", codigos: ["MAT-021", "MAT-022", "MAT-023", "MAT-024"], opciones: [{id: "medida", nombre: "Medida", valores: ["AWG 1/0 – AWG 1/0", "AWG 4/0 – AWG 4/0", "AWG 1/0 – No. 2 Cu", "AWG 1/0 para estribo"]}], ficha: [["Instalación", "A presión"]]},
    {id: "co-conector", linea: "conexion", nombre: "Conector para estribo y tierra", detalle: "Amovible, de compresión o Hammerlock.", modelo: "conector", modo: "cotizar", codigos: ["MAT-019", "MAT-020", "MAT-025"], opciones: [{id: "tipo", nombre: "Tipo", valores: ["Amovible para estribo", "Compresión #2 – #2 Cu", "Hammerlock para pica"]}], ficha: [["Uso", "Estribo y puesta a tierra"]]},
    {id: "co-ampact", linea: "conexion", nombre: "Carga Ampact", detalle: "Para la herramienta de conectores Ampact.", modelo: "conector", modo: "cotizar", codigos: ["MAT-012", "MAT-013"], opciones: [{id: "color", nombre: "Color", valores: ["Azul", "Roja"]}], ficha: [["Uso", "Herramienta Ampact"]]},
    {id: "co-terminal", linea: "conexion", nombre: "Terminal de compresión de pletina", detalle: "Para conductor de aluminio o cobre.", modelo: "conector", modo: "cotizar", codigos: ["MAT-048", "MAT-049", "MAT-050"], opciones: [{id: "conductor", nombre: "Conductor", valores: ["1/0 AWG", "4/0 AWG", "Cobre No. 2"]}], ficha: [["Instalación", "Compresión"]]},
    {id: "co-pica", linea: "conexion", nombre: "Pica de puesta a tierra 5/8 × 8'", detalle: "Varilla para la tierra del poste.", modelo: "pica", modo: "cotizar", codigos: ["MAT-037"], ficha: [["Medida", "5/8 × 8 pies"]]},
    {id: "co-grapa-tierra", linea: "conexion", nombre: "Grapa de conexión para cable a tierra", detalle: "Sin tornillo, para varilla de 5/8.", modelo: "grapa", modo: "cotizar", codigos: ["MAT-030"], ficha: [["Medida", "5/8"]]}
  ],

  obras: [
    { foto: "img/linieros-poste.webp", titulo: "Montaje en poste", texto: "Transformador, cortacircuitos y acometida en un mismo día." },
    { foto: "img/linieros-canastas.webp", titulo: "Línea energizada", texto: "Cuadrillas con canasta y equipo de altura." },
    { foto: "img/transformadores-trio.webp", titulo: "Bancos trifásicos", texto: "Tres unidades conectadas y probadas." },
    { foto: "img/conectores.webp", titulo: "Cada herraje cuenta", texto: "Conectores y tornillería que no se aflojan." },
    { foto: "img/pasatapas.webp", titulo: "Subestaciones", texto: "Aislamiento revisado antes de energizar." }
  ]
};
