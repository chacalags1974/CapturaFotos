// ── LABELS (orden actualizado) ──────────────────────────────────
const LBL_BAS = [
    { key: "INE_FRENTE", nombre: "INE Frente" },
    { key: "INE_ATRAS", nombre: "INE Atrás" },
    { key: "CONTRATO", nombre: "Contrato" },
    { key: "FOTO_ENTREGA", nombre: "Foto Entrega" }
];

const LBL_MED = [
    { key: "CURP_OPCIONAL", nombre: "CURP (opcional)" },
    { key: "INE_FRENTE", nombre: "INE Frente" },
    { key: "INE_ATRAS", nombre: "INE Atrás" },
    { key: "CONTRATO", nombre: "Contrato" },
    { key: "FOTO_ENTREGA", nombre: "Foto Entrega" }
];

const SK_CFG = "expdig_cfg_v3";

let cfg = { nombre: "", cupo: "", sede: "", cct: "", tipo: "basica" };
let fotos = [];
let contadorSesion = 0;
let infoExpandido = true;

// ── PERSISTENCIA ──────────────────────────────────────────────
function cfgLoad() {
    try {
        const s = localStorage.getItem(SK_CFG);
        if (s) {
            const loaded = JSON.parse(s);
            cfg = { ...cfg, ...loaded };
        }
    } catch (e) {}
    // Asegurar que tipo siempre sea válido
    if (cfg.tipo !== "basica" && cfg.tipo !== "media") cfg.tipo = "basica";
}
function cfgSave() { localStorage.setItem(SK_CFG, JSON.stringify(cfg)); }

// ── HELPERS ───────────────────────────────────────────────────
function labels() { return cfg.tipo === "basica" ? LBL_BAS : LBL_MED; }
function getCURP() { return document.getElementById("inCURP").value.trim().toUpperCase(); }
function validaCURP(c) { return c && /^[A-Z0-9]{18}$/i.test(c); }
function dataURLtoBlob(dataURL) {
    const [hdr, b64] = dataURL.split(",");
    const mime = hdr.match(/:(.*?);/)[1];
    const raw = atob(b64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return new Blob([arr], { type: mime });
}
function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 600);
}
function hoy() { return new Date().toISOString().slice(0, 10); }
function actualizarContador() {
    const contSpan = document.getElementById("contadorSesion");
    if (contSpan) contSpan.textContent = `Expedientes hoy: ${contadorSesion}`;
}

// ── INIT FOTOS (con render posterior) ─────────────────────────
function initFotos() {
    fotos = labels().map(l => ({ ...l, dataURL: null, guardada: false }));
}

// ── INFO BAR CON TOGGLE (sin duplicar botón) ──────────────────
function renderIBar() {
    const bar = document.getElementById("ibar");
    if (!bar) return;

    // Buscar o crear el botón toggle
    let toggleBtn = document.getElementById("toggleInfoBtn");
    if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "toggleInfoBtn";
        toggleBtn.className = "btn-toggle";
        toggleBtn.addEventListener("click", () => {
            infoExpandido = !infoExpandido;
            renderIBar();  // reconstruir la barra
        });
        bar.appendChild(toggleBtn);
    }

    // Construir chips según modo
    const chips = [];
    if (infoExpandido) {
        if (cfg.nombre) chips.push(`<span class="chip"><span class="lb">Servidor:</span>${cfg.nombre}</span>`);
        if (cfg.cupo) chips.push(`<span class="chip"><span class="lb">CUPO:</span>${cfg.cupo}</span>`);
        if (cfg.sede) chips.push(`<span class="chip"><span class="lb">Sede:</span>${cfg.sede}</span>`);
        if (cfg.cct) chips.push(`<span class="chip"><span class="lb">CCT:</span>${cfg.cct}</span>`);
        if (!chips.length) chips.push('<span class="chip empty">Sin configurar — toca ⚙</span>');
        toggleBtn.textContent = "^";
    } else {
        if (cfg.cupo) chips.push(`<span class="chip"><span class="lb">CUPO:</span>${cfg.cupo}</span>`);
        if (cfg.cct) chips.push(`<span class="chip"><span class="lb">CCT:</span>${cfg.cct}</span>`);
        if (!chips.length) chips.push('<span class="chip empty">Sin configurar — toca ⚙</span>');
        toggleBtn.textContent = "+";
    }

    // Limpiar y reconstruir contenido (conservando el botón)
    const oldToggle = document.getElementById("toggleInfoBtn");
    bar.innerHTML = "";
    const chipsSpan = document.createElement("span");
    chipsSpan.innerHTML = chips.join("");
    bar.appendChild(chipsSpan);
    bar.appendChild(oldToggle);  // reinsertar el mismo botón
    const contSpan = document.createElement("span");
    contSpan.className = "contador";
    contSpan.id = "contadorSesion";
    contSpan.textContent = `Expedientes hoy: ${contadorSesion}`;
    bar.appendChild(contSpan);
}

// ── RENDER FOTOS (sin cambios funcionales) ────────────────────
function renderFotos() {
    const grid = document.getElementById("fgrid");
    grid.innerHTML = "";
    const idxAct = fotos.findIndex(f => !f.guardada);
    fotos.forEach((foto, idx) => {
        const guardada = foto.guardada;
        const tieneImg = !!foto.dataURL;
        const activa = idx === idxAct && !guardada;
        const bloq = !guardada && !activa;
        let sc = "s-blq";
        if (guardada) sc = "s-ok";
        else if (activa && tieneImg) sc = "s-cap";
        else if (activa) sc = "s-act";
        const row = document.createElement("div");
        row.className = `frow ${sc}`;
        const num = document.createElement("div");
        num.className = "fnum";
        num.innerHTML = guardada ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>` : `${idx+1}`;
        let estTxt = bloq ? "Bloqueada" : guardada ? "✓ Guardada" : tieneImg ? "📷 Lista — Descarga / Continúa" : "▶ Activa — toca Cámara";
        const info = document.createElement("div");
        info.className = "finfo";
        info.innerHTML = `<div class="fnombre">${foto.nombre}</div><div class="festado">${estTxt}</div>`;
        let thumb = null;
        if (tieneImg) {
            thumb = document.createElement("img");
            thumb.className = "fthumb";
            thumb.src = foto.dataURL;
            thumb.alt = foto.nombre;
        }
        const acc = document.createElement("div");
        acc.className = "facc";
        const fi = document.createElement("input");
        fi.type = "file";
        fi.accept = "image/*";
        fi.capture = "environment";
        fi.style.display = "none";
        fi.addEventListener("change", function() {
            const f = this.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = ev => { fotos[idx].dataURL = ev.target.result; this.value = ""; renderFotos(); };
            r.readAsDataURL(f);
        });
        if (tieneImg && !guardada) {
            const bc = document.createElement("button");
            bc.className = "fb fb-cam cap";
            bc.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Retomar`;
            bc.addEventListener("click", () => fi.click());
            acc.appendChild(bc);
            const bd = document.createElement("button");
            bd.className = "fb fb-dl";
            bd.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Descargar foto`;
            bd.addEventListener("click", () => {
                const curp = getCURP();
                if (!validaCURP(curp)) { alert("Primero ingresa la CURP del beneficiario."); document.getElementById("inCURP").focus(); return; }
                descargar(dataURLtoBlob(foto.dataURL), `${curp}_${foto.key}.jpg`);
            });
            acc.appendChild(bd);
            const bs = document.createElement("button");
            bs.className = "fb fb-save";
            bs.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Continuar`;
            bs.addEventListener("click", () => { fotos[idx].guardada = true; renderFotos(); });
            acc.appendChild(bs);
        }
        if (!tieneImg && !guardada && activa) {
            const bc = document.createElement("button");
            bc.className = "fb fb-cam";
            bc.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Cámara`;
            bc.addEventListener("click", () => fi.click());
            acc.appendChild(bc);
        }
        if (bloq) {
            const bc = document.createElement("button");
            bc.className = "fb fb-cam blq";
            bc.disabled = true;
            bc.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Bloqueada`;
            acc.appendChild(bc);
        }
        if (guardada) {
            const tag = document.createElement("span");
            tag.className = "fb fb-saved";
            tag.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Guardada`;
            acc.appendChild(tag);
        }
        row.appendChild(num);
        row.appendChild(info);
        if (thumb) row.appendChild(thumb);
        row.appendChild(acc);
        row.appendChild(fi);
        grid.appendChild(row);
    });
    actuProg();
    actuBtnZip();
    actuBadge();
}

function actuProg() {
    const tot = fotos.length;
    const gu = fotos.filter(f => f.guardada).length;
    const pct = tot ? Math.round(gu / tot * 100) : 0;
    document.getElementById("pbar").style.width = pct + "%";
    document.getElementById("plbl").textContent = `${gu} / ${tot} fotos guardadas`;
}

function actuBtnZip() {
    const btn = document.getElementById("btnZip");
    const ok = fotos.length > 0 && fotos.every(f => f.guardada);
    btn.className = "btn-zip " + (ok ? "listo" : "pend");
    btn.disabled = !ok;
}

function actuBadge() {
    const b = document.getElementById("tbadge");
    const t = document.getElementById("tbadgeTxt");
    if (cfg.tipo === "basica") { b.className = "tbadge basica"; t.textContent = "Básica · 4 fotos"; }
    else { b.className = "tbadge media"; t.textContent = "Media/Superior · 5 fotos"; }
}

function expedienteCompleto() { return fotos.length > 0 && fotos.every(f => f.guardada); }

async function generarZip() {
    const curp = getCURP();
    if (!validaCURP(curp)) { document.getElementById("errCURP").style.display = "block"; return; }
    if (!expedienteCompleto()) { alert("Debes completar todas las fotos antes de descargar el ZIP."); return; }
    const btn = document.getElementById("btnZip");
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Generando ZIP…`;
    try {
        const fechaHoy = hoy();
        const cupoActual = cfg.cupo || 'SIN_CUPO';
        const raiz = `${fechaHoy}_${cupoActual}`;
        const zip = new JSZip();
        const carpetaRaiz = zip.folder(raiz);
        const carpetaCurp = carpetaRaiz.folder(curp);
        fotos.forEach(f => carpetaCurp.file(`${curp}_${f.key}.jpg`, dataURLtoBlob(f.dataURL)));
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        descargar(blob, `${raiz}.zip`);
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ¡ZIP descargado correctamente!`;
        setTimeout(() => { btn.innerHTML = textoOriginal; btn.disabled = false; actuBtnZip(); }, 3000);
    } catch (e) { alert("Error al generar ZIP: " + e.message); btn.innerHTML = textoOriginal; btn.disabled = false; actuBtnZip(); }
}

function abrirNuevo() {
    if (!expedienteCompleto()) { alert("Completa todas las fotos antes de iniciar un nuevo expediente."); return; }
    document.getElementById("nTipo").value = cfg.tipo;
    document.getElementById("mNuevo").classList.add("vis");
}
function cerrarNuevo() { document.getElementById("mNuevo").classList.remove("vis"); }
function iniciarNuevo() {
    const tipoSeleccionado = document.getElementById("nTipo").value;
    if (tipoSeleccionado !== cfg.tipo) {
        cfg.tipo = tipoSeleccionado;
        cfgSave();
        initFotos();
    }
    document.getElementById("inCURP").value = "";
    initFotos();
    contadorSesion++;
    actualizarContador();
    renderIBar();
    renderFotos();
    document.getElementById("inCURP").focus();
    cerrarNuevo();
}

function abrirModal() {
    document.getElementById("cNombre").value = cfg.nombre;
    document.getElementById("cCUPO").value = cfg.cupo;
    document.getElementById("cSede").value = cfg.sede;
    document.getElementById("cCCT").value = cfg.cct;
    document.getElementById("cTipo").value = cfg.tipo;
    document.getElementById("mCfg").classList.add("vis");
}
function cerrarModal() { document.getElementById("mCfg").classList.remove("vis"); }
function guardarCfg() {
    const nuevoTipo = document.getElementById("cTipo").value;
    const cambio = nuevoTipo !== cfg.tipo;
    cfg.nombre = document.getElementById("cNombre").value.trim();
    cfg.cupo = document.getElementById("cCUPO").value.trim();
    cfg.sede = document.getElementById("cSede").value.trim();
    cfg.cct = document.getElementById("cCCT").value.trim();
    cfg.tipo = nuevoTipo;
    cfgSave();
    cerrarModal();
    renderIBar();
    if (cambio) {
        document.getElementById("inCURP").value = "";
        initFotos();
        renderFotos();
    }
    const b = document.getElementById("btnCfg");
    b.style.borderColor = "var(--grn)";
    setTimeout(() => { b.style.borderColor = ""; }, 800);
}

// ── EVENTOS ───────────────────────────────────────────────────
document.getElementById("btnCfg").addEventListener("click", abrirModal);
document.getElementById("btnX").addEventListener("click", cerrarModal);
document.getElementById("mCfg").addEventListener("click", e => { if (e.target === document.getElementById("mCfg")) cerrarModal(); });
document.getElementById("btnSaveCfg").addEventListener("click", guardarCfg);
document.getElementById("btnNuevoExp").addEventListener("click", abrirNuevo);
document.getElementById("btnXNew").addEventListener("click", cerrarNuevo);
document.getElementById("mNuevo").addEventListener("click", e => { if (e.target === document.getElementById("mNuevo")) cerrarNuevo(); });
document.getElementById("btnIniciarNuevo").addEventListener("click", iniciarNuevo);
document.getElementById("btnZip").addEventListener("click", generarZip);
document.getElementById("inCURP").addEventListener("input", function() { this.value = this.value.toUpperCase(); document.getElementById("errCURP").style.display = "none"; });
document.getElementById("cCUPO").addEventListener("input", function() { this.value = this.value.toUpperCase(); });

// ── INICIO CORREGIDO: carga la configuración, inicializa fotos y renderiza todo ──
cfgLoad();
initFotos();        // se construye con el tipo actual (básica por defecto)
renderIBar();
renderFotos();
actualizarContador();
