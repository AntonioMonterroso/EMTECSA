"use strict";
window.EMT_GEO = (() => {
  const M = {
    "Alta Verapaz": ["Cobán", "Santa Cruz Verapaz", "San Cristóbal Verapaz", "Tactic", "Tamahú", "Tucurú", "Panzós", "Senahú", "San Pedro Carchá", "San Juan Chamelco", "Lanquín", "Cahabón", "Chisec", "Chahal", "Fray Bartolomé de las Casas", "Santa Catalina La Tinta", "Raxruhá"],
    "Baja Verapaz": ["Salamá", "San Miguel Chicaj", "Rabinal", "Cubulco", "Granados", "Santa Cruz El Chol", "San Jerónimo", "Purulhá"],
    "Chimaltenango": ["Chimaltenango", "San José Poaquil", "San Martín Jilotepeque", "San Juan Comalapa", "Santa Apolonia", "Tecpán Guatemala", "Patzún", "San Miguel Pochuta", "Patzicía", "Santa Cruz Balanyá", "Acatenango", "San Pedro Yepocapa", "San Andrés Itzapa", "Parramos", "Zaragoza", "El Tejar"],
    "Chiquimula": ["Chiquimula", "San José La Arada", "San Juan Ermita", "Jocotán", "Camotán", "Olopa", "Esquipulas", "Concepción Las Minas", "Quezaltepeque", "San Jacinto", "Ipala"],
    "El Progreso": ["Guastatoya", "Morazán", "San Agustín Acasaguastlán", "San Cristóbal Acasaguastlán", "El Jícaro", "Sansare", "Sanarate", "San Antonio La Paz"],
    "Escuintla": ["Escuintla", "Santa Lucía Cotzumalguapa", "La Democracia", "Siquinalá", "Masagua", "Tiquisate", "La Gomera", "Guanagazapa", "San José", "Iztapa", "Palín", "San Vicente Pacaya", "Nueva Concepción", "Sipacate"],
    "Guatemala": ["Guatemala", "Santa Catarina Pinula", "San José Pinula", "San José del Golfo", "Palencia", "Chinautla", "San Pedro Ayampuc", "Mixco", "San Pedro Sacatepéquez", "San Juan Sacatepéquez", "San Raymundo", "Chuarrancho", "Fraijanes", "Amatitlán", "Villa Nueva", "Villa Canales", "San Miguel Petapa"],
    "Huehuetenango": ["Huehuetenango", "Chiantla", "Malacatancito", "Cuilco", "Nentón", "San Pedro Necta", "Jacaltenango", "Soloma", "Ixtahuacán", "Santa Bárbara", "La Libertad", "La Democracia", "San Miguel Acatán", "San Rafael La Independencia", "Todos Santos Cuchumatán", "San Juan Atitán", "Santa Eulalia", "San Mateo Ixtatán", "Colotenango", "San Sebastián Huehuetenango", "Tectitán", "Concepción Huista", "San Juan Ixcoy", "San Antonio Huista", "San Sebastián Coatán", "Barillas", "Aguacatán", "San Rafael Petzal", "San Gaspar Ixchil", "Santiago Chimaltenango", "Santa Ana Huista", "Unión Cantinil", "Petatán"],
    "Izabal": ["Puerto Barrios", "Livingston", "El Estor", "Morales", "Los Amates"],
    "Jalapa": ["Jalapa", "San Pedro Pinula", "San Luis Jilotepeque", "San Manuel Chaparrón", "San Carlos Alzatate", "Monjas", "Mataquescuintla"],
    "Jutiapa": ["Jutiapa", "El Progreso", "Santa Catarina Mita", "Agua Blanca", "Asunción Mita", "Yupiltepeque", "Atescatempa", "Jerez", "El Adelanto", "Zapotitlán", "Comapa", "Jalpatagua", "Conguaco", "Moyuta", "Pasaco", "San José Acatempa", "Quesada"],
    "Petén": ["Flores", "San José", "San Benito", "San Andrés", "La Libertad", "San Francisco", "Santa Ana", "Dolores", "San Luis", "Sayaxché", "Melchor de Mencos", "Poptún", "Las Cruces", "El Chal"],
    "Quetzaltenango": ["Quetzaltenango", "Salcajá", "Olintepeque", "San Carlos Sija", "Sibilia", "Cabricán", "Cajolá", "San Miguel Sigüilá", "San Juan Ostuncalco", "San Mateo", "Concepción Chiquirichapa", "San Martín Sacatepéquez", "Almolonga", "Cantel", "Huitán", "Zunil", "Colomba Costa Cuca", "San Francisco La Unión", "El Palmar", "Coatepeque", "Génova", "Flores Costa Cuca", "La Esperanza", "Palestina de Los Altos"],
    "Quiché": ["Santa Cruz del Quiché", "Chiché", "Chinique", "Zacualpa", "Chajul", "Chichicastenango", "Patzité", "San Antonio Ilotenango", "San Pedro Jocopilas", "Cunén", "San Juan Cotzal", "Joyabaj", "Nebaj", "San Andrés Sajcabajá", "Uspantán", "Sacapulas", "San Bartolomé Jocotenango", "Canillá", "Chicamán", "Ixcán", "Pachalum"],
    "Retalhuleu": ["Retalhuleu", "San Sebastián", "Santa Cruz Muluá", "San Martín Zapotitlán", "San Felipe", "San Andrés Villa Seca", "Champerico", "Nuevo San Carlos", "El Asintal"],
    "Sacatepéquez": ["Antigua Guatemala", "Jocotenango", "Pastores", "Sumpango", "Santo Domingo Xenacoj", "Santiago Sacatepéquez", "San Bartolomé Milpas Altas", "San Lucas Sacatepéquez", "Santa Lucía Milpas Altas", "Magdalena Milpas Altas", "Santa María de Jesús", "Ciudad Vieja", "San Miguel Dueñas", "Alotenango", "San Antonio Aguas Calientes", "Santa Catarina Barahona"],
    "San Marcos": ["San Marcos", "San Pedro Sacatepéquez", "San Antonio Sacatepéquez", "Comitancillo", "San Miguel Ixtahuacán", "Concepción Tutuapa", "Tacaná", "Sibinal", "Tajumulco", "Tejutla", "San Rafael Pie de la Cuesta", "Nuevo Progreso", "El Tumbador", "El Rodeo", "Malacatán", "Catarina", "Ayutla", "Ocós", "San Pablo", "El Quetzal", "La Reforma", "Pajapita", "Ixchiguán", "San José Ojetenam", "San Cristóbal Cucho", "Sipacapa", "Esquipulas Palo Gordo", "Río Blanco", "San Lorenzo", "La Blanca"],
    "Santa Rosa": ["Cuilapa", "Barberena", "Santa Rosa de Lima", "Casillas", "San Rafael Las Flores", "Oratorio", "San Juan Tecuaco", "Chiquimulilla", "Taxisco", "Santa María Ixhuatán", "Guazacapán", "Santa Cruz Naranjo", "Pueblo Nuevo Viñas", "Nueva Santa Rosa"],
    "Sololá": ["Sololá", "San José Chacayá", "Santa María Visitación", "Santa Lucía Utatlán", "Nahualá", "Santa Catarina Ixtahuacán", "Santa Clara La Laguna", "Concepción", "San Andrés Semetabaj", "Panajachel", "Santa Catarina Palopó", "San Antonio Palopó", "San Lucas Tolimán", "Santa Cruz La Laguna", "San Pablo La Laguna", "San Marcos La Laguna", "San Juan La Laguna", "San Pedro La Laguna", "Santiago Atitlán"],
    "Suchitepéquez": ["Mazatenango", "Cuyotenango", "San Francisco Zapotitlán", "San Bernardino", "San José El Ídolo", "Santo Domingo Suchitepéquez", "San Lorenzo", "Samayac", "San Pablo Jocopilas", "San Antonio Suchitepéquez", "San Miguel Panán", "San Gabriel", "Chicacao", "Patulul", "Santa Bárbara", "San Juan Bautista", "Santo Tomás La Unión", "Zunilito", "Pueblo Nuevo", "Río Bravo", "San José La Máquina"],
    "Totonicapán": ["Totonicapán", "San Cristóbal Totonicapán", "San Francisco El Alto", "San Andrés Xecul", "Momostenango", "Santa María Chiquimula", "Santa Lucía La Reforma", "San Bartolo"],
    "Zacapa": ["Zacapa", "Estanzuela", "Río Hondo", "Gualán", "Teculután", "Usumatlán", "Cabañas", "San Diego", "La Unión", "Huité", "San Jorge"]
  };
  const DEPTOS = Object.keys(M).sort((a, b) => a.localeCompare(b, "es"));
  const normal = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const depto = s => DEPTOS.find(d => normal(d) === normal(s)) || null;
  const municipios = d => { const k = depto(d); return k ? M[k].slice().sort((a, b) => a.localeCompare(b, "es")) : []; };
  const municipio = (d, s) => municipios(d).find(m => normal(m) === normal(s)) || null;
  const deptosDe = s => DEPTOS.filter(d => M[d].some(m => normal(m) === normal(s)));

  function revisar(d, m, que = "") {
    const dd = String(d || "").trim(), mm = String(m || "").trim();
    if (!dd && !mm) return { departamento: "", municipio: "" };
    const kd = dd ? depto(dd) : (deptosDe(mm).length === 1 ? deptosDe(mm)[0] : null);
    if (!kd) throw new Error(dd ? `Escoja el departamento${que} de la lista.` : `Escoja primero el departamento${que}.`);
    if (!mm) return { departamento: kd, municipio: "" };
    const km = municipio(kd, mm);
    if (!km) throw new Error(`«${mm}» no es un municipio de ${kd}. Escoja uno de la lista${que}.`);
    return { departamento: kd, municipio: km };
  }

  let n = 0;
  const par = (el, sel) => {
    const g = el.getAttribute("data-geo-muni") ?? el.getAttribute("data-geo-depto") ?? "";
    const caja = el.closest("form, fieldset, .modal, section, [data-geo-caja]") || document;
    return caja.querySelector(sel === "muni" ? `[data-geo-muni="${g}"]` : `[data-geo-depto="${g}"]`);
  };
  function llenar(mi) {
    const de = par(mi, "depto");
    if (!mi.id) mi.id = "geo-m-" + (++n);
    let dl = document.getElementById(mi.id + "-l");
    if (!dl) { dl = document.createElement("datalist"); dl.id = mi.id + "-l"; mi.after(dl); mi.setAttribute("list", dl.id); }
    const lista = de ? municipios(de.value) : [];
    dl.innerHTML = lista.map(m => `<option value="${m.replace(/"/g, "&quot;")}"></option>`).join("");
    mi.placeholder = de && de.value ? `Municipio de ${depto(de.value) || de.value}` : "Escoja primero el departamento";
  }
  document.addEventListener("focusin", e => { const mi = e.target.closest && e.target.closest("[data-geo-muni]"); if (mi) llenar(mi); });
  document.addEventListener("change", e => {
    const de = e.target.closest && e.target.closest("[data-geo-depto]");
    if (de) { const mi = par(de, "muni"); if (mi) { if (mi.value && !municipio(de.value, mi.value)) { mi.value = ""; mi.dispatchEvent(new Event("input", { bubbles: true })); } llenar(mi); } return; }
    const mi = e.target.closest && e.target.closest("[data-geo-muni]");
    if (mi) { const d2 = par(mi, "depto"); if (d2 && !d2.value) { const opc = deptosDe(mi.value); if (opc.length === 1) { d2.value = opc[0]; d2.dispatchEvent(new Event("change", { bubbles: true })); } } else if (d2) { const k = municipio(d2.value, mi.value); if (k && k !== mi.value) mi.value = k; } }
  });
  const opcionesDepto = (actual, vacio = "Escoja…") => `<option value="">${vacio}</option>` + DEPTOS.map(d => `<option ${normal(actual) === normal(d) ? "selected" : ""}>${d}</option>`).join("");
  const mapa = partes => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(partes.map(x => String(x || "").trim()).filter(Boolean).concat("Guatemala").join(", "));

  return { DEPTOS, municipios, depto, municipio, revisar, opcionesDepto, mapa };
})();
