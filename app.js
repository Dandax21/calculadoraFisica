// app.js — Interfaz: acceso, navegación, calculadora, historial, perfil, administración y pruebas.
// Todo se guarda en localStorage (solo en este navegador). Las cuentas son de DEMOSTRACIÓN.
const $ = (s) => document.querySelector(s);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { aviso("No se pudo guardar en el navegador."); return false; } },
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
function aviso(t) { const e = $("#toast"); e.textContent = t; e.className = "on"; setTimeout(() => (e.className = ""), 2600); }
async function sha(s) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch (e) { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) | 0; return "f" + x; }
}
const usuarios = () => LS.get("fis_usuarios", []);
const hist = () => LS.get("fis_hist", []);
const yo = () => usuarios().find((u) => u.id === LS.get("fis_sesion", null));
let vista = "inicio", modA = null, ultimo = null, pre = null, modoReg = false;
const ICO = { MRU: "🏃", MRUA: "🚀", Newton: "🍎", Coulomb: "⚡", Ohm: "🔌" };

// Menú desplegable propio <x-sel> (el nativo del navegador no se puede redondear)
class XSel extends HTMLElement {
  connectedCallback() {
    this.ops = JSON.parse(this.getAttribute("op"));
    this._v = this.getAttribute("value") || this.ops[0][0];
    this.pinta();
  }
  get value() { return this._v; }
  set value(v) { this._v = v; this.pinta(); }
  pinta() {
    const o = this.ops.find((x) => x[0] === this._v) || this.ops[0], dis = this.hasAttribute("disabled");
    this.innerHTML = `<button type="button" class="sb" ${dis ? "disabled" : ""}>${esc(o[1])}<i>⌄</i></button><div class="sm">${this.ops.map((x) => `<div class="so${x[0] === this._v ? " on" : ""}" data-v="${esc(x[0])}">${esc(x[1])}</div>`).join("")}</div>`;
    this.querySelector(".sb").onclick = (e) => { e.stopPropagation(); const a = this.classList.contains("abierto"); cerrar(); if (!a) this.classList.add("abierto"); };
    this.querySelectorAll(".so").forEach((el) => (el.onclick = (e) => { e.stopPropagation(); this._v = el.dataset.v; this.classList.remove("abierto"); this.pinta(); this.dispatchEvent(new Event("change")); }));
  }
}
customElements.define("x-sel", XSel);
const cerrar = () => document.querySelectorAll("x-sel.abierto").forEach((e) => e.classList.remove("abierto"));
document.addEventListener("click", cerrar);
const sel = (id, ops, val, ch, extra) => `<x-sel id="${id}" value="${esc(val)}" op="${esc(JSON.stringify(ops))}" ${ch ? `onchange="${ch}"` : ""} ${extra || ""}></x-sel>`;

// Anima el resultado contando desde 0 hasta el valor final
function contar(el, x, txt) {
  const t0 = performance.now();
  (function f(t) { const p = Math.min((t - t0) / 700, 1); el.textContent = p < 1 ? fmt(x * (1 - Math.pow(1 - p, 3)), 4) : txt; if (p < 1) requestAnimationFrame(f); })(t0);
}
// Llena el módulo actual con un ejemplo de los casos de prueba y lo calcula
function ejemplo() {
  const p = PRUEBAS.find((x) => x[1] === modA && x[4] !== null);
  pre = { obj: p[2], raw: {} };
  for (const k in p[3]) pre.raw[k] = { v: p[3][k][0], u: p[3][k][1] };
  campos(); calcular();
}

async function iniciar() {
  if (!usuarios().length) {
    const h = await sha("Demo1234");
    LS.set("fis_usuarios", [
      { id: "u1", nombre: "Estudiante Demo", correo: "estudiante@demo.com", hash: h, rol: "estudiante", activo: true },
      { id: "u2", nombre: "Docente Demo", correo: "docente@demo.com", hash: h, rol: "docente", activo: true },
      { id: "u3", nombre: "Admin Demo", correo: "admin@demo.com", hash: h, rol: "administrador", activo: true },
    ]);
  }
  pintar();
}

/* ---------- Acceso ---------- */
function acceso() {
  return `<div class="login"><div class="hero"><h1>⚛ Sistema Integral de Resolución de Problemas de Física</h1><p>MRU · MRUA · Newton · Coulomb · Ohm</p></div>
  <div class="card"><h2>${modoReg ? "Crear cuenta" : "Iniciar sesión"}</h2><p class="aviso">Modo demostración: no uses contraseñas reales.</p>
  <form onsubmit="${modoReg ? "registrar" : "entrar"}(event)">${modoReg ? '<label>Nombre<input id="rn" required></label>' : ""}
  <label>Correo<input id="lc" type="email" required></label><label>Contraseña<input id="lp" type="password" required></label>
  <div id="err" class="err"></div><button class="pri">${modoReg ? "Registrarme" : "Entrar"}</button></form>
  <p><a href="#" onclick="modoReg=!modoReg;pintar();return false">${modoReg ? "Ya tengo cuenta" : "Crear una cuenta nueva"}</a></p>
  ${modoReg ? "" : `<h3>Cuentas demo (contraseña: Demo1234)</h3><div class="row">${[["estudiante", "Estudiante"], ["docente", "Docente"], ["admin", "Administrador"]].map((a) => `<button type="button" onclick="demo('${a[0]}@demo.com')">${a[1]}</button>`).join("")}</div>`}</div></div>`;
}
function demo(c) { $("#lc").value = c; $("#lp").value = "Demo1234"; }
function errAcc(t) { $("#err").textContent = t; }
async function entrar(e) {
  e.preventDefault();
  const c = $("#lc").value.trim().toLowerCase(), h = await sha($("#lp").value);
  const u = usuarios().find((x) => x.correo === c && x.hash === h);
  if (!u) return errAcc("Correo o contraseña incorrectos.");
  if (!u.activo) return errAcc("Esta cuenta está desactivada.");
  LS.set("fis_sesion", u.id); vista = "inicio"; pintar();
}
async function registrar(e) {
  e.preventDefault();
  const n = $("#rn").value.trim(), c = $("#lc").value.trim().toLowerCase(), p = $("#lp").value;
  if (!/^\S+@\S+\.\S+$/.test(c)) return errAcc("Escribe un correo válido.");
  if (p.length < 8) return errAcc("La contraseña debe tener al menos 8 caracteres.");
  if (usuarios().some((x) => x.correo === c)) return errAcc("Ese correo ya está registrado.");
  const l = usuarios(); const u = { id: "u" + Date.now(), nombre: n, correo: c, hash: await sha(p), rol: "estudiante", activo: true };
  l.push(u); LS.set("fis_usuarios", l); LS.set("fis_sesion", u.id); modoReg = false; vista = "inicio"; pintar();
}
function salir() { LS.set("fis_sesion", null); pintar(); }
function tema() { const t = document.documentElement.dataset.tema === "claro" ? "oscuro" : "claro"; document.documentElement.dataset.tema = t; LS.set("fis_tema", t); }
function ir(v) { vista = v; pintar(); }
function abrir(m) { modA = m; pre = null; ultimo = null; vista = "calc"; pintar(); }

/* ---------- Calculadora ---------- */
function campos() {
  const M = E[modA], o = $("#obj");
  if (pre) o.value = pre.obj;
  const obj = o.value;
  $("#campos").innerHTML = Object.keys(M.v).filter((k) => k !== obj).map((k) => `<div class="fld"><label>${M.v[k][1]} (${M.v[k][0]})<input id="i_${k}" inputmode="decimal" placeholder="0"></label>${sel("u_" + k, Object.keys(U[M.v[k][2]]).map((x) => [x, x]), Object.keys(U[M.v[k][2]])[0])}</div>`).join("");
  if (pre) { for (const k in pre.raw) { const i = $("#i_" + k); if (i) { i.value = pre.raw[k].v; $("#u_" + k).value = pre.raw[k].u; } } pre = null; }
  $("#res").innerHTML = ""; ultimo = null;
}
function limpiar() { campos(); }
function calcular() {
  const M = E[modA], obj = $("#obj").value, raw = {};
  for (const k in M.v) if (k !== obj) raw[k] = { v: $("#i_" + k).value, u: $("#u_" + k).value };
  const r = resolver(modA, obj, raw);
  ultimo = r.valido ? { mod: modA, obj, raw, r } : null;
  setTimeout(() => {
    if (r.valido && r.resultado.valor.length === 1 && $("#rv")) contar($("#rv"), r.resultado.valor[0], r.resultado.texto);
    $("#res").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 30);
  $("#res").innerHTML = r.valido
    ? `<div class="card out"><div class="big">${M.v[obj][0]} = <span id="rv">${r.resultado.texto}</span> <small>${r.resultado.unidad}</small></div><h3>Procedimiento</h3><ol>${r.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}<li>Fórmula: <code>${esc(r.formula)}</code></li><li>Despeje: <code>${esc(r.despeje)}</code></li><li>Sustitución: <code>${esc(r.sustitucion)}</code></li><li>Resultado: <b>${r.resultado.texto} ${r.resultado.unidad}</b></li></ol>${r.advertencias.map((a) => `<p class="aviso">⚠ ${a}</p>`).join("")}<button onclick="guardar()">💾 Guardar en historial</button></div>`
    : `<div class="card bad"><b>No se pudo calcular</b><ul>${r.errores.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`;
}
function guardar() {
  if (!ultimo) return;
  const { formula, despeje, sustitucion, pasos, resultado } = ultimo.r, h = hist();
  h.push({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 6), usuarioDemoId: yo().id, modulo: ultimo.mod, variableObjetivo: ultimo.obj, entradas: ultimo.raw, resultado: { valor: resultado.valor, unidad: resultado.unidad, texto: resultado.texto }, procedimiento: { formula, despeje, sustitucion, pasos }, fechaHora: new Date().toISOString(), versionCalculo: "1.0" });
  if (LS.set("fis_hist", h)) aviso("Ejercicio guardado ✔");
}

/* ---------- Historial ---------- */
function ver(id) { const e = $("#d_" + id); e.hidden = !e.hidden; }
function borrar(id) { const u = yo(); LS.set("fis_hist", hist().filter((h) => !(h.id === id && h.usuarioDemoId === u.id))); pintar(); }
function reabrir(id) { const h = hist().find((x) => x.id === id); if (!h) return; modA = h.modulo; pre = { obj: h.variableObjetivo, raw: h.entradas }; vista = "calc"; pintar(); }

/* ---------- Admin ---------- */
function rol(id, v) { LS.set("fis_usuarios", usuarios().map((u) => (u.id === id ? { ...u, rol: v } : u))); pintar(); }
function estado(id) { LS.set("fis_usuarios", usuarios().map((u) => (u.id === id ? { ...u, activo: !u.activo } : u))); pintar(); }
function nombre() { const n = $("#pn").value.trim(); if (!n) return aviso("El nombre no puede estar vacío."); LS.set("fis_usuarios", usuarios().map((u) => (u.id === yo().id ? { ...u, nombre: n } : u))); aviso("Perfil actualizado ✔"); pintar(); }

/* ---------- Vistas ---------- */
const vistas = {
  inicio: (u) => `<h1>Hola, ${esc(u.nombre)} 👋</h1><p class="sub">Elige un módulo para empezar.</p><div class="grid">${Object.keys(E).map((m, i) => `<button class="mod" style="--c:${E[m].c};--d:${i * 70}ms" onclick="abrir('${m}')"><span class="ico">${ICO[m]}</span><b>${m}</b><span>${E[m].desc}</span></button>`).join("")}</div>`,
  calc: () => { const M = E[modA]; return `<button class="back" onclick="ir('inicio')">‹ Inicio</button><div class="ttl"><span class="ico" style="--c:${M.c}">${ICO[modA]}</span><div><h1>${modA}</h1><p class="sub">${M.desc}</p></div></div><div class="chips">${M.eq.map((e) => `<span>${e[0]}</span>`).join("")}</div><div class="card"><div class="lbl">¿Qué quieres calcular?${sel("obj", Object.keys(M.v).map((k) => [k, `${M.v[k][1]} (${M.v[k][0]})`]), Object.keys(M.v)[0], "campos()")}</div><div id="campos"></div><div class="row"><button class="pri" onclick="calcular()">Calcular</button><button onclick="ejemplo()">✨ Ejemplo</button><button onclick="limpiar()">Limpiar</button></div></div><div id="res"></div>`; },
  hist: (u) => {
    const fm = $("#fm") ? $("#fm").value : "", fd = $("#fd") ? $("#fd").value : "";
    const l = hist().filter((h) => h.usuarioDemoId === u.id && (!fm || h.modulo === fm) && (!fd || h.fechaHora.slice(0, 10) === fd)).reverse();
    return `<h1>Historial</h1><div class="row">${sel("fm", [["", "Todos los módulos"], ...Object.keys(E).map((m) => [m, m])], fm, "pintar()")}<input id="fd" type="date" value="${fd}" onchange="pintar()"></div>` +
      (l.length ? l.map((h) => `<div class="card item" style="--c:${E[h.modulo].c}"><b>${h.modulo}</b> · ${E[h.modulo].v[h.variableObjetivo][0]} = ${esc(h.resultado.texto)} ${esc(h.resultado.unidad)} <small>${new Date(h.fechaHora).toLocaleString("es-MX")}</small><div class="row"><button onclick="ver('${h.id}')">Ver</button><button onclick="reabrir('${h.id}')">Reabrir</button><button onclick="borrar('${h.id}')">Eliminar</button></div><div id="d_${h.id}" class="det" hidden><p>${h.procedimiento.pasos.map(esc).join("<br>")}</p><p>Fórmula: <code>${esc(h.procedimiento.formula)}</code><br>Sustitución: <code>${esc(h.procedimiento.sustitucion)}</code></p></div></div>`).join("") : '<div class="card">Aún no hay ejercicios guardados.</div>');
  },
  perfil: (u) => `<h1>Perfil</h1><div class="card"><label>Nombre<input id="pn" value="${esc(u.nombre)}"></label><p>Correo: <b>${esc(u.correo)}</b></p><p>Rol: <b>${u.rol}</b></p><button class="pri" onclick="nombre()">Guardar cambios</button></div>`,
  admin: (u) => {
    if (u.rol !== "administrador") return '<div class="card bad">Acceso restringido a administradores.</div>';
    const us = usuarios(), hs = hist();
    return `<h1>Administración</h1><div class="grid stats"><div class="card"><b>${us.length}</b> usuarios</div><div class="card"><b>${us.filter((x) => x.activo).length}</b> activos</div>${Object.keys(E).map((m) => `<div class="card"><b>${hs.filter((h) => h.modulo === m).length}</b> ejercicios ${m}</div>`).join("")}</div><div class="card"><table><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th></tr>${us.map((x) => `<tr><td>${esc(x.nombre)}</td><td>${esc(x.correo)}</td><td>${sel("r_" + x.id, ["estudiante", "docente", "administrador"].map((r) => [r, r]), x.rol, "rol('" + x.id + "',this.value)", x.id === u.id ? "disabled" : "")}</td><td><button ${x.id === u.id ? "disabled" : ""} onclick="estado('${x.id}')">${x.activo ? "Activa ✔" : "Inactiva ✖"}</button></td></tr>`).join("")}</table></div><p class="sub">El administrador gestiona cuentas, pero no ve el contenido de los historiales.</p>`;
  },
  pruebas: () => {
    let n = 0;
    const f = PRUEBAS.map((p) => {
      const raw = {}; for (const k in p[3]) raw[k] = { v: p[3][k][0], u: p[3][k][1] };
      const r = resolver(p[1], p[2], raw); let ok, got;
      if (p[4] === null) { ok = !r.valido; got = r.valido ? "Calculó " + r.resultado.texto : r.errores[0]; }
      else { got = r.valido ? r.resultado.texto + " " + r.resultado.unidad : r.errores[0]; ok = r.valido && Math.abs(r.resultado.valor[0] - p[4]) <= Math.abs(p[4]) * 1e-3; }
      if (ok) n++;
      return `<tr class="${ok ? "ok" : "no"}"><td>${p[0]}</td><td>${p[1]} → ${E[p[1]].v[p[2]][0]}</td><td>${p[4] === null ? "Error controlado" : p[4]}</td><td>${esc(got)}</td><td>${ok ? "Aprobado" : "No aprobado"}</td></tr>`;
    }).join("");
    return `<h1>Pruebas</h1><p class="sub">${n} de ${PRUEBAS.length} aprobadas · ${new Date().toLocaleString("es-MX")}<br>${esc(navigator.userAgent)}</p><div class="card tw"><table><tr><th>ID</th><th>Caso</th><th>Esperado</th><th>Obtenido</th><th>Estado</th></tr>${f}</table></div>`;
  },
};

function pintar() {
  const u = yo();
  if (!u || !u.activo) { $("#raiz").innerHTML = acceso(); return; }
  const nav = [["inicio", "Inicio"], ["hist", "Historial"], ["perfil", "Perfil"], ...(u.rol === "administrador" ? [["admin", "Admin"]] : []), ["pruebas", "Pruebas"]];
  $("#raiz").innerHTML = `<header><button class="logo" onclick="ir('inicio')">⚛ Física</button><nav>${nav.map((n) => `<button class="${vista === n[0] || (vista === "calc" && n[0] === "inicio") ? "on" : ""}" onclick="ir('${n[0]}')">${n[1]}</button>`).join("")}</nav><span><button onclick="tema()" title="Cambiar tema">◐</button><button onclick="salir()">Salir</button></span></header><section id="main">${vistas[vista](u)}</section>`;
  if (vista === "calc") campos();
}

document.documentElement.dataset.tema = LS.get("fis_tema", matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "oscuro");
iniciar();
