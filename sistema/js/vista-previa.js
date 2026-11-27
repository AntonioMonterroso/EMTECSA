"use strict";
window.EMT_PREVIA = (() => {
  const A = () => window.EMT_APP;
  const BASE = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  let cargando = null, abierto = null;
  const lib = () => cargando || (cargando = new Promise((ok, mal) => {
    if (window.pdfjsLib) { ok(window.pdfjsLib); return; }
    const s = document.createElement("script");
    s.src = BASE + "pdf.min.js"; s.integrity = "sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e"; s.crossOrigin = "anonymous";
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + "pdf.worker.min.js"; ok(window.pdfjsLib); };
    s.onerror = () => { cargando = null; mal(new Error("sin visor")); };
    document.head.appendChild(s);
  }));
  const comoBlob = (x, tipo) => x instanceof Blob ? x : new Blob([x], { type: tipo || "application/pdf" });
  function bajar(blob, nombre) {
    const u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = nombre || "documento.pdf"; document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  }
  function cerrar() {
    if (!abierto) return;
    const { el, obs, urls, antes } = abierto; abierto = null;
    obs && obs.disconnect(); urls.forEach(u => URL.revokeObjectURL(u));
    el.classList.add("sale"); setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 160);
    document.documentElement.classList.remove("con-previa");
    if (antes && antes.focus) antes.focus({ preventScroll: true });
  }
  async function pintarPDF(cuerpo, blob, estado, nPag) {
    const pdfjs = await lib();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    if (!abierto || abierto.cuerpo !== cuerpo) return;
    nPag.textContent = `${doc.numPages} ${doc.numPages === 1 ? "página" : "páginas"}`;
    cuerpo.innerHTML = "";
    const ancho = () => Math.min(cuerpo.clientWidth - 24, 900);
    const hojas = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const vp = pg.getViewport({ scale: 1 });
      const h = document.createElement("div"); h.className = "prev-hoja"; h.style.aspectRatio = `${vp.width} / ${vp.height}`; h.style.width = ancho() + "px"; h.dataset.n = i;
      h.setAttribute("aria-label", `Página ${i}`);
      cuerpo.appendChild(h); hojas.push([h, pg]);
    }
    const pintar = async (h, pg) => {
      if (h.dataset.lista) return; h.dataset.lista = "1";
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const vp0 = pg.getViewport({ scale: 1 }), esc = (h.clientWidth * dpr) / vp0.width, vp = pg.getViewport({ scale: esc });
      const cv = document.createElement("canvas"); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      h.appendChild(cv);
      await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    };
    estado.obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const x = hojas.find(([h]) => h === e.target); if (x) pintar(x[0], x[1]).catch(() => {}); } }), { root: cuerpo, rootMargin: "600px 0px" });
    hojas.forEach(([h]) => estado.obs.observe(h));
  }
  function abrir({ titulo = "Vista previa", pdf = null, html = null, nombre = "documento.pdf", tipo = "application/pdf", acciones = [], alDescargar = null }) {
    const { ico, esc } = A();
    cerrar();
    const blob = pdf ? comoBlob(pdf, tipo) : null;
    const el = document.createElement("div");
    el.className = "prev"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", titulo);
    el.innerHTML = `<div class="prev-cab"><div class="prev-t"><b>${esc(titulo)}</b><small data-prev-n>${pdf ? "Armando la vista previa…" : ""}</small></div>
      <div class="prev-acc">${acciones.map((a, i) => `<button class="s-btn ${a.principal ? "lleno" : "suave-b"}" type="button" data-prev-acc="${i}">${a.icono ? ico(a.icono, 15) : ""}${esc(a.texto)}</button>`).join("")}${blob || alDescargar ? `<button class="s-btn suave-b" type="button" data-prev-bajar>${ico("download", 15)}Descargar</button>` : ""}<button class="s-ib" type="button" aria-label="Cerrar la vista previa" data-prev-x>${ico("x", 16)}</button></div></div>
      <div class="prev-cuerpo" tabindex="-1"></div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add("con-previa");
    const cuerpo = el.querySelector(".prev-cuerpo"), nPag = el.querySelector("[data-prev-n]");
    const estado = { el, cuerpo, obs: null, urls: [], antes: document.activeElement, hash: location.hash };
    abierto = estado;
    el.addEventListener("click", async e => {
      if (e.target.closest("[data-prev-x]")) { cerrar(); return; }
      if (e.target.closest("[data-prev-bajar]")) { if (alDescargar) await alDescargar(); else bajar(blob, nombre); return; }
      const a = e.target.closest("[data-prev-acc]"); if (a) { const x = acciones[Number(a.dataset.prevAcc)]; if (x && x.alTocar) { if (x.cerrar !== false) cerrar(); await x.alTocar(); } }
    });
    el.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } });
    el.querySelector("[data-prev-x]").focus({ preventScroll: true });
    if (html != null) { cuerpo.innerHTML = `<div class="prev-html">${html}</div>`; return; }
    if (!blob) return;
    if (/^image\//.test(blob.type)) { const u = URL.createObjectURL(blob); estado.urls.push(u); cuerpo.innerHTML = `<img class="prev-img" src="${u}" alt="${esc(titulo)}">`; nPag.textContent = ""; return; }
    cuerpo.innerHTML = `<div class="prev-espera"><span class="prev-giro"></span>Armando la vista previa…</div>`;
    pintarPDF(cuerpo, blob, estado, nPag).catch(() => {
      if (!abierto || abierto.cuerpo !== cuerpo) return;
      const u = URL.createObjectURL(blob); estado.urls.push(u);
      nPag.textContent = "";
      cuerpo.innerHTML = `<iframe class="prev-marco" src="${u}" title="${esc(titulo)}"></iframe>`;
    });
  }
  addEventListener("hashchange", e => {
    if (!abierto) return;
    let viejo = ""; try { viejo = new URL(e.oldURL).hash; } catch (_) {}
    if (viejo === abierto.hash && location.hash !== abierto.hash) cerrar();
  });
  return { abrir, cerrar, bajar };
})();
