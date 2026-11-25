// calculos.js — Motor de cálculo (sin interfaz). Todo se calcula en unidades del SI.
const K = 8.99e9; // constante de Coulomb (N·m²/C²)

// Conversión de unidades: cuánto vale cada unidad en la unidad base del SI
const U = {
  longitud: { m: 1, km: 1e3, cm: 0.01 },
  tiempo: { s: 1, min: 60, h: 3600 },
  vel: { "m/s": 1, "km/h": 1 / 3.6 },
  acel: { "m/s²": 1 },
  masa: { kg: 1, g: 0.001 },
  fuerza: { N: 1, kN: 1e3 },
  carga: { C: 1, mC: 1e-3, "μC": 1e-6, nC: 1e-9 },
  volt: { V: 1, mV: 1e-3, kV: 1e3 },
  corr: { A: 1, mA: 1e-3 },
  res: { "Ω": 1, "kΩ": 1e3 },
};

const raiz = (x) => {
  if (x < 0) throw Error("No existe solución real (raíz de un número negativo).");
  return Math.sqrt(x);
};
// Ecuación cuadrática para el tiempo en MRUA: ½·a·t² + vi·t − Δx = 0
const cuad = (d) => {
  const A = d.a / 2, B = d.i, C = -d.x;
  if (A === 0) return [-C / B];
  const D = B * B - 4 * A * C;
  if (D < 0) throw Error("No existe solución real (discriminante negativo).");
  const s = Math.sqrt(D);
  return [(-B + s) / (2 * A), (-B - s) / (2 * A)];
};

// Cada módulo: v = variables [símbolo, nombre, tipo de unidad, unidad SI]
// eq = ecuaciones; cada una tiene "qué despejar": [texto del despeje, función]
const E = {
  MRU: {
    desc: "Movimiento rectilíneo uniforme", c: "#38bdf8", pos: { t: 0 },
    v: { x: ["Δx", "Desplazamiento", "longitud", "m"], v: ["v", "Velocidad", "vel", "m/s"], t: ["t", "Tiempo", "tiempo", "s"] },
    eq: [["Δx = v·t", {
      x: ["{x} = {v}·{t}", (d) => d.v * d.t],
      v: ["{v} = {x} / {t}", (d) => d.x / d.t],
      t: ["{t} = {x} / {v}", (d) => d.x / d.v],
    }]],
  },
  MRUA: {
    desc: "Movimiento rectilíneo uniformemente acelerado", c: "#a78bfa", pos: { t: 0 },
    v: { i: ["vi", "Velocidad inicial", "vel", "m/s"], f: ["vf", "Velocidad final", "vel", "m/s"], a: ["a", "Aceleración", "acel", "m/s²"], x: ["Δx", "Desplazamiento", "longitud", "m"], t: ["t", "Tiempo", "tiempo", "s"] },
    eq: [
      ["vf = vi + a·t", {
        f: ["{f} = {i} + {a}·{t}", (d) => d.i + d.a * d.t],
        i: ["{i} = {f} − {a}·{t}", (d) => d.f - d.a * d.t],
        a: ["{a} = ({f} − {i}) / {t}", (d) => (d.f - d.i) / d.t],
        t: ["{t} = ({f} − {i}) / {a}", (d) => (d.f - d.i) / d.a],
      }],
      ["Δx = vi·t + ½·a·t²", {
        x: ["{x} = {i}·{t} + ½·{a}·{t}²", (d) => d.i * d.t + 0.5 * d.a * d.t ** 2],
        i: ["{i} = ({x} − ½·{a}·{t}²) / {t}", (d) => (d.x - 0.5 * d.a * d.t ** 2) / d.t],
        a: ["{a} = 2·({x} − {i}·{t}) / {t}²", (d) => 2 * (d.x - d.i * d.t) / d.t ** 2],
        t: ["Resolver ½·{a}·t² + {i}·t − {x} = 0 (fórmula general)", cuad],
      }],
      ["vf² = vi² + 2·a·Δx", {
        f: ["{f} = √({i}² + 2·{a}·{x})", (d) => raiz(d.i ** 2 + 2 * d.a * d.x)],
        i: ["{i} = √({f}² − 2·{a}·{x})", (d) => raiz(d.f ** 2 - 2 * d.a * d.x)],
        a: ["{a} = ({f}² − {i}²) / (2·{x})", (d) => (d.f ** 2 - d.i ** 2) / (2 * d.x)],
        x: ["{x} = ({f}² − {i}²) / (2·{a})", (d) => (d.f ** 2 - d.i ** 2) / (2 * d.a)],
      }],
      ["Δx = (vi + vf)·t / 2", {
        x: ["{x} = ({i} + {f})·{t} / 2", (d) => (d.i + d.f) * d.t / 2],
        i: ["{i} = 2·{x} / {t} − {f}", (d) => 2 * d.x / d.t - d.f],
        f: ["{f} = 2·{x} / {t} − {i}", (d) => 2 * d.x / d.t - d.i],
        t: ["{t} = 2·{x} / ({i} + {f})", (d) => 2 * d.x / (d.i + d.f)],
      }],
    ],
  },
  Newton: {
    desc: "Segunda ley de Newton", c: "#fb923c", pos: { m: 1 },
    v: { f: ["F", "Fuerza neta", "fuerza", "N"], m: ["m", "Masa", "masa", "kg"], a: ["a", "Aceleración", "acel", "m/s²"] },
    chk: (d) => (d.m !== undefined && d.m <= 0 ? "La masa debe ser mayor que cero." : ""),
    eq: [["ΣF = m·a", {
      f: ["{f} = {m}·{a}", (d) => d.m * d.a],
      m: ["{m} = {f} / {a}", (d) => d.f / d.a],
      a: ["{a} = {f} / {m}", (d) => d.f / d.m],
    }]],
  },
  Coulomb: {
    desc: "Ley de Coulomb", c: "#f472b6", pos: { r: 1 },
    v: { f: ["F", "Fuerza (magnitud)", "fuerza", "N"], q1: ["q₁", "Carga 1", "carga", "C"], q2: ["q₂", "Carga 2", "carga", "C"], r: ["r", "Distancia", "longitud", "m"] },
    chk: (d) => (d.r !== undefined && d.r <= 0 ? "La distancia r debe ser mayor que cero." : ""),
    eq: [["|F| = k·|q₁·q₂| / r²", {
      f: ["{f} = k·|{q1}·{q2}| / {r}²", (d) => K * Math.abs(d.q1 * d.q2) / d.r ** 2],
      r: ["{r} = √(k·|{q1}·{q2}| / {f})", (d) => raiz(K * Math.abs(d.q1 * d.q2) / d.f)],
      q1: ["|{q1}| = {f}·{r}² / (k·|{q2}|)", (d) => d.f * d.r ** 2 / (K * Math.abs(d.q2))],
      q2: ["|{q2}| = {f}·{r}² / (k·|{q1}|)", (d) => d.f * d.r ** 2 / (K * Math.abs(d.q1))],
    }]],
  },
  Ohm: {
    desc: "Ley de Ohm", c: "#facc15",
    v: { v: ["V", "Voltaje", "volt", "V"], i: ["I", "Corriente", "corr", "A"], r: ["R", "Resistencia", "res", "Ω"] },
    eq: [["V = I·R", {
      v: ["{v} = {i}·{r}", (d) => d.i * d.r],
      i: ["{i} = {v} / {r}", (d) => d.v / d.r],
      r: ["{r} = {v} / {i}", (d) => d.v / d.i],
    }]],
  },
};

// Da formato a un número (notación científica si es muy grande o muy pequeño)
const fmt = (n, p = 6) => {
  const a = Math.abs(n);
  if (a !== 0 && (a >= 1e6 || a < 1e-3)) return n.toExponential(p === 6 ? 3 : 3).replace("e+", "×10^").replace("e", "×10^");
  return String(+n.toPrecision(p));
};

// resolver(módulo, variable a calcular, valores) -> resultado o errores
// valores: { variable: { v: "texto escrito", u: "unidad" } }
function resolver(mod, obj, raw) {
  const M = E[mod], d = {}, pasos = [], adv = [], er = [];
  for (const k in M.v) {
    if (k === obj) continue;
    const r = raw[k] || { v: "", u: "" }, s = String(r.v).trim();
    if (s === "") continue;
    const n = Number(s.replace(",", "."));
    if (!isFinite(n)) { er.push(`El valor "${s}" de ${M.v[k][0]} no es un número válido.`); continue; }
    const f = U[M.v[k][2]][r.u];
    d[k] = n * f;
    if (f !== 1) pasos.push(`Conversión: ${n} ${r.u} = ${fmt(d[k])} ${M.v[k][3]}`);
  }
  if (er.length) return { valido: false, errores: er };
  const c = M.chk && M.chk(d);
  if (c) return { valido: false, errores: [c] };
  let falta = null;
  for (const [nombre, fs] of M.eq) {
    if (!fs[obj]) continue;
    const f = Object.keys(fs).filter((k) => k !== obj && !(k in d));
    if (f.length) { falta = falta || f; continue; }
    try {
      const p = M.pos && M.pos[obj];
      const r = [].concat(fs[obj][1](d)).filter((x) => isFinite(x) && (p === undefined || (p ? x > 0 : x >= 0)));
      if (!r.length) return { valido: false, errores: ["Cálculo no definido o sin solución física con estos datos (por ejemplo, división entre cero)."] };
      const sim = (t) => t.replace(/\{(\w+)\}/g, (m, k) => M.v[k][0]);
      const sus = fs[obj][0].replace(/\{(\w+)\}/g, (m, k) => k === obj ? M.v[k][0] : d[k] < 0 ? `(${fmt(d[k])})` : fmt(d[k])).replace("k·", "8.99×10⁹·");
      const datos = Object.keys(d).map((k) => `${M.v[k][0]} = ${fmt(d[k])} ${M.v[k][3]}`).join(";  ");
      if (r.length > 1) adv.push("Hay dos tiempos físicos posibles; se muestran ambos.");
      if (mod === "Coulomb" && obj === "f" && d.q1 * d.q2 !== 0) adv.push(d.q1 * d.q2 < 0 ? "Interacción atractiva (cargas de signo opuesto)." : "Interacción repulsiva (cargas del mismo signo).");
      if (mod === "Coulomb" && obj !== "f" && obj !== "r") adv.push("Se obtiene la magnitud de la carga.");
      return {
        valido: true,
        resultado: { valor: r, unidad: M.v[obj][3], texto: r.map((x) => fmt(x, 4)).join(" o ") },
        formula: nombre, despeje: sim(fs[obj][0]), sustitucion: sus,
        pasos: ["Datos en unidades SI: " + datos, ...pasos], advertencias: adv,
      };
    } catch (e) { return { valido: false, errores: [e.message] }; }
  }
  return { valido: false, errores: ["Datos insuficientes. Falta: " + (falta || []).map((k) => M.v[k][0]).join(", ") + "."] };
}

// Casos de prueba: [ID, módulo, variable, {entradas:[valor, unidad]}, esperado (null = debe dar error)]
const PRUEBAS = [
  ["PF-01", "MRU", "x", { v: [12, "m/s"], t: [5, "s"] }, 60],
  ["PF-02", "MRU", "t", { x: [100, "m"], v: [20, "m/s"] }, 5],
  ["PF-03", "MRUA", "f", { i: [2, "m/s"], a: [3, "m/s²"], t: [4, "s"] }, 14],
  ["PF-04", "MRUA", "x", { i: [2, "m/s"], a: [3, "m/s²"], t: [4, "s"] }, 32],
  ["PF-05", "Newton", "f", { m: [10, "kg"], a: [3, "m/s²"] }, 30],
  ["PF-06", "Newton", "a", { f: [40, "N"], m: [8, "kg"] }, 5],
  ["PF-07", "Coulomb", "f", { q1: [2, "μC"], q2: [-3, "μC"], r: [0.3, "m"] }, 0.5993],
  ["PF-08", "Ohm", "i", { v: [12, "V"], r: [6, "Ω"] }, 2],
  ["PF-09", "Ohm", "v", { i: [0.5, "A"], r: [20, "Ω"] }, 10],
  ["PV-01", "MRU", "t", { x: [100, "m"], v: [0, "m/s"] }, null],
  ["PV-02", "MRU", "x", { v: [10, "m/s"], t: ["", "s"] }, null],
  ["PV-03", "Coulomb", "f", { q1: [1, "μC"], q2: [2, "μC"], r: [0, "m"] }, null],
  ["PV-04", "Newton", "f", { m: [-5, "kg"], a: [2, "m/s²"] }, null],
  ["PV-05", "MRUA", "t", { i: [0, "m/s"], a: [2, "m/s²"], x: [-10, "m"] }, null],
  ["PV-06", "MRU", "x", { v: ["abc", "m/s"], t: [5, "s"] }, null],
  ["PV-07", "Coulomb", "f", { q1: [1, "μC"], q2: [-2, "μC"], r: [0.3, "m"] }, 0.1998],
];
