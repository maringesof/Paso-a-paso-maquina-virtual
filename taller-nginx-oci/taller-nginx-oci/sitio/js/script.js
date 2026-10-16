// ===== 1. Menú hamburguesa (móviles) =====
const menuBtn = document.getElementById("menu-btn");
const menu = document.getElementById("menu");

menuBtn.addEventListener("click", () => {
  const abierto = menu.classList.toggle("abierto");
  menuBtn.setAttribute("aria-expanded", abierto);
});

// Cerrar el menú al elegir una opción
menu.querySelectorAll("a").forEach((enlace) => {
  enlace.addEventListener("click", () => menu.classList.remove("abierto"));
});

// ===== 2. Visor de imágenes de la galería =====
const visor = document.getElementById("visor");
const visorImg = document.getElementById("visor-img");

document.querySelectorAll(".galeria img").forEach((img) => {
  img.addEventListener("click", () => {
    visorImg.src = img.src;
    visorImg.alt = img.alt;
    visor.hidden = false;
  });
});

function cerrarVisor() {
  visor.hidden = true;
}
document.getElementById("cerrar-visor").addEventListener("click", cerrarVisor);
visor.addEventListener("click", (e) => {
  if (e.target === visor) cerrarVisor();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarVisor();
});

// ===== 3. Marcador interactivo con cronómetro =====
const DURACION = 90 * 60; // 90 minutos en segundos
const VELOCIDAD = 30;     // 1 segundo real = 30 segundos de partido (3 min reales)

let segundos = 0;
let intervalo = null;
let goles = { local: 0, visitante: 0 };

const reloj = document.getElementById("reloj");
const estado = document.getElementById("estado");
const btnIniciar = document.getElementById("btn-iniciar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const historial = document.getElementById("historial");
const botonesGol = document.querySelectorAll(".boton-gol");

function formatearTiempo(seg) {
  const min = String(Math.floor(seg / 60)).padStart(2, "0");
  const s = String(seg % 60).padStart(2, "0");
  return `${min}:${s}`;
}

function nombreEquipo(equipo) {
  const input = document.getElementById(`nombre-${equipo}`);
  return input.value.trim() || (equipo === "local" ? "Local" : "Visitante");
}

function actualizarEstado() {
  if (segundos >= DURACION) {
    estado.textContent = "Final del partido";
  } else if (intervalo) {
    estado.textContent = segundos < DURACION / 2 ? "Primer tiempo" : "Segundo tiempo";
  } else {
    estado.textContent = segundos === 0 ? "Sin iniciar" : "En pausa";
  }
}

function terminarPartido() {
  clearInterval(intervalo);
  intervalo = null;
  btnIniciar.disabled = true;
  botonesGol.forEach((b) => (b.disabled = true));

  const l = goles.local;
  const v = goles.visitante;
  let resultado = "¡Empate!";
  if (l > v) resultado = `¡Ganó ${nombreEquipo("local")}!`;
  if (v > l) resultado = `¡Ganó ${nombreEquipo("visitante")}!`;

  agregarAlHistorial(`🏁 Final: ${nombreEquipo("local")} ${l} - ${v} ${nombreEquipo("visitante")}. ${resultado}`);
  actualizarEstado();
}

function iniciarPausar() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
    btnIniciar.textContent = "Reanudar";
  } else {
    intervalo = setInterval(() => {
      segundos += VELOCIDAD;
      if (segundos >= DURACION) segundos = DURACION;
      reloj.textContent = formatearTiempo(segundos);
      actualizarEstado();
      if (segundos >= DURACION) terminarPartido();
    }, 1000);
    btnIniciar.textContent = "Pausar";
  }
  actualizarEstado();
}

function agregarAlHistorial(texto) {
  const vacio = historial.querySelector(".vacio");
  if (vacio) vacio.remove();
  const li = document.createElement("li");
  li.textContent = texto;
  historial.prepend(li);
}

function anotarGol(equipo) {
  if (!intervalo) {
    estado.textContent = "Inicia el cronómetro para anotar";
    return;
  }
  goles[equipo]++;
  const marcador = document.getElementById(`goles-${equipo}`);
  marcador.textContent = goles[equipo];

  // Reiniciar la animación
  marcador.classList.remove("animar");
  void marcador.offsetWidth;
  marcador.classList.add("animar");

  const minuto = Math.floor(segundos / 60) + 1;
  agregarAlHistorial(`⚽ Minuto ${minuto}' — Gol de ${nombreEquipo(equipo)}`);
}

function reiniciar() {
  clearInterval(intervalo);
  intervalo = null;
  segundos = 0;
  goles = { local: 0, visitante: 0 };
  reloj.textContent = "00:00";
  document.getElementById("goles-local").textContent = "0";
  document.getElementById("goles-visitante").textContent = "0";
  historial.innerHTML = '<li class="vacio">Aún no hay goles.</li>';
  btnIniciar.textContent = "Iniciar";
  btnIniciar.disabled = false;
  botonesGol.forEach((b) => (b.disabled = false));
  actualizarEstado();
}

btnIniciar.addEventListener("click", iniciarPausar);
btnReiniciar.addEventListener("click", reiniciar);
botonesGol.forEach((boton) => {
  boton.addEventListener("click", () => anotarGol(boton.dataset.equipo));
});

// ===== 4. Año automático en el pie de página =====
document.getElementById("anio").textContent = new Date().getFullYear();
