# Taller: Publicación del sitio "Pasión Fútbol" con Nginx y DuckDNS en Oracle Cloud Infrastructure (OCI)

**Asignatura:** [Nombre de la asignatura]
**Estudiante:** [Nombre completo]
**Docente:** [Nombre del docente]
**Fecha:** [DD/MM/AAAA]
**Repositorio / entrega:** [Enlace, si aplica]

---

## Tabla de contenido

1. [Objetivo](#objetivo)
2. [Requisitos previos](#requisitos-previos)
3. [Arquitectura de la solución](#arquitectura-de-la-solución)
4. [Infraestructura existente](#infraestructura-existente-taller-inicial)
5. [Paso 1 – Crear la nueva instancia (máquina virtual)](#paso-1--crear-la-nueva-instancia-máquina-virtual)
6. [Paso 2 – Conectarse por SSH](#paso-2--conectarse-por-ssh)
7. [Paso 3 – Actualizar el sistema operativo](#paso-3--actualizar-el-sistema-operativo)
8. [Paso 4 – Instalar y verificar Nginx](#paso-4--instalar-y-verificar-nginx)
9. [Paso 5 – Abrir el puerto 80 (OCI + firewall de la instancia)](#paso-5--abrir-el-puerto-80-oci--firewall-de-la-instancia)
10. [Paso 6 – Construir la página web y subirla a la instancia](#paso-6--construir-la-página-web-y-subirla-a-la-instancia)
11. [Paso 7 – Configurar el sitio en Nginx](#paso-7--configurar-el-sitio-en-nginx)
12. [Paso 8 – Crear el subdominio en DuckDNS](#paso-8--crear-el-subdominio-en-duckdns)
13. [Paso 9 – Actualización automática de la IP en DuckDNS](#paso-9--actualización-automática-de-la-ip-en-duckdns)
14. [Paso 10 – Pruebas desde un navegador externo](#paso-10--pruebas-desde-un-navegador-externo)
15. [Problemas encontrados y soluciones](#problemas-encontrados-y-soluciones)
16. [Conclusiones](#conclusiones)
17. [Referencias](#referencias)

> **Convención de capturas:** guarde todas las imágenes en una carpeta `capturas/` junto a este archivo y nómbrelas `paso-XX-descripcion.png`. Reemplace cada marcador `![...]()` por su captura real. Tape en las capturas el token de DuckDNS y cualquier dato sensible de la cuenta de OCI (OCID del tenancy, correo).

---

## Objetivo

[Redacte en 2–3 líneas el objetivo del taller. Ejemplo: desplegar en Oracle Cloud Infrastructure una instancia independiente con Nginx que sirva un sitio web propio, accesible por HTTP mediante un subdominio gratuito de DuckDNS.]

## Requisitos previos

| Herramienta | Versión / detalle | Uso |
|---|---|---|
| Cuenta de OCI | Free Tier / créditos de la universidad | Infraestructura en la nube |
| VCN del taller inicial | [Nombre de la VCN] | Red reutilizada |
| Imagen del SO | Canonical Ubuntu [22.04 / 24.04] | Sistema operativo de la instancia |
| Nginx | [x.x] | Servidor web |
| Cliente SSH | PowerShell / Terminal / OCI Cloud Shell | Conexión remota |
| Cuenta DuckDNS | — | Subdominio dinámico |
| Navegador / celular | — | Pruebas externas |

## Arquitectura de la solución

```
[Navegador externo] ──HTTP:80──> [misubdominio.duckdns.org]
                                        │ (resuelve a la IP pública)
                                        ▼
                   ┌──────────── OCI – Región [región] ────────────┐
                   │  VCN del taller inicial                        │
                   │   └─ Internet Gateway                          │
                   │   └─ Subred pública + Security List (TCP 80)   │
                   │        └─ Instancia nueva: Ubuntu + Nginx      │
                   │             /var/www/mi-sitio                  │
                   └────────────────────────────────────────────────┘
```

[Describa brevemente: qué VCN y subred reutilizó, qué IP pública tiene la instancia y cómo viaja una petición desde el navegador hasta Nginx.]

---

## Infraestructura existente (taller inicial)

La red del taller inicial ya está creada en OCI y se reutiliza sin cambios. Datos usados en esta guía:

| Elemento | Valor |
|---|---|
| Región | `[región, ej. sa-bogota-1]` |
| Compartimento | `[compartimento]` |
| VCN | `[nombre-vcn]` |
| Subred pública | `[nombre-subred]` |
| Internet Gateway | `[nombre-igw]` |
| Security List | `[nombre-security-list]` |

---

## Paso 1 – Crear la nueva instancia (máquina virtual)

**Descripción:** se crea una instancia diferente a la usada en clase (nombre distinto), conectada a la misma VCN.

1.1. Iniciar sesión en https://cloud.oracle.com y seleccionar arriba a la derecha la región usada en el taller inicial: `[región]`.

1.2. Ir a **Menú ☰ → Compute → Instances**, elegir el compartimento `[compartimento]` y presionar **Create instance**.

1.3. Configurar:

| Campo | Valor |
|---|---|
| Name | `[nombre-vm]` (ej. `patito-server`) — distinto al de clase |
| Compartment | `[compartimento]` |
| Availability domain | El que tenga capacidad disponible |
| Image | **Canonical Ubuntu [22.04 / 24.04]** |
| Shape | `VM.Standard.E2.1.Micro` (Always Free) o `VM.Standard.A1.Flex` (1 OCPU, 6 GB) |
| Primary VNIC – VCN | `[nombre-vcn]` del taller inicial |
| Subnet | Subred **pública** |
| Public IPv4 address | **Assign a public IPv4 address** ✔ |
| SSH keys | **Generate a key pair for me** → descargar la llave privada y la pública |

1.4. Presionar **Create** y esperar a que el estado pase a **Running**.

1.5. Anotar la IP pública que aparece en **Instance details → Primary VNIC**: `[IP_PUBLICA]`.

> Si aparece el error *Out of capacity*, cambie de Availability Domain o use la otra shape Always Free.
> Opcional: para que la IP nunca cambie, cree una **Reserved Public IP** (Networking → IP Management) y asígnela a la VNIC.

**Resultado esperado:** instancia en estado *Running* con IP pública.

![Paso 1 – Consola de OCI, Compute → Instances](capturas/paso-01-consola.png)
![Paso 1 – Imagen y shape](capturas/paso-01-imagen-shape.png)
![Paso 1 – Red y llaves SSH](capturas/paso-01-red-ssh.png)
![Paso 1 – Instancia en Running](capturas/paso-01-running.png)

---

## Paso 2 – Conectarse por SSH

2.1. Ubicar la llave privada descargada (ej. `ssh-key-[fecha].key`) en una carpeta de trabajo.

2.2. Restringir los permisos de la llave:

**Linux / macOS:**

```bash
chmod 400 ssh-key-[fecha].key
```

**Windows (PowerShell):**

```powershell
icacls .\ssh-key-[fecha].key /inheritance:r
icacls .\ssh-key-[fecha].key /grant:r "$($env:USERNAME):(R)"
```

2.3. Conectarse (en las imágenes Ubuntu de OCI el usuario es `ubuntu`):

```bash
ssh -i ssh-key-[fecha].key ubuntu@[IP_PUBLICA]
```

2.4. Verificar dentro de la instancia:

```bash
hostname
ip -4 addr show
curl -s ifconfig.me   # debe mostrar la IP pública
```

**Resultado esperado:** prompt `ubuntu@[nombre-vm]:~$`.

![Paso 2 – Conexión SSH](capturas/paso-02-ssh.png)

---

## Paso 3 – Actualizar el sistema operativo

```bash
sudo apt update
sudo apt upgrade -y
```

**Resultado esperado:** paquetes actualizados sin errores.

![Paso 3 – Actualización](capturas/paso-03-apt-upgrade.png)

---

## Paso 4 – Instalar y verificar Nginx

4.1. Instalar el servicio:

```bash
sudo apt install nginx -y
```

4.2. Habilitar el arranque automático y verificar el estado:

```bash
sudo systemctl enable nginx
sudo systemctl status nginx
```

4.3. Probar desde la propia instancia:

```bash
curl -I http://localhost
```

**Resultado esperado:** `Active: active (running)` y `HTTP/1.1 200 OK`.

> En este punto **todavía no** se verá la página desde fuera: OCI bloquea el puerto 80 por defecto (se abre en el paso 5).

![Paso 4 – Estado de Nginx](capturas/paso-04-nginx-status.png)

---

## Paso 5 – Abrir el puerto 80 (OCI + firewall de la instancia)

**Descripción:** en OCI el tráfico pasa por **dos** filtros: la Security List de la subred (nube) y las reglas `iptables` de la propia instancia. Ambos deben permitir el puerto 80.

### 5.1. Regla de ingreso en la Security List (consola de OCI)

**Networking → Virtual cloud networks → `[nombre-vcn]` → Security Lists → `[security list de la subred]` → Add Ingress Rules:**

| Campo | Valor |
|---|---|
| Stateless | ☐ (sin marcar) |
| Source Type | CIDR |
| Source CIDR | `0.0.0.0/0` |
| IP Protocol | TCP |
| Source Port Range | *(vacío)* |
| Destination Port Range | `80` |
| Description | HTTP Nginx |

> Si la VNIC usa un **Network Security Group (NSG)**, agregue la misma regla en el NSG.

### 5.2. Regla en el firewall de la instancia (iptables)

Las imágenes Ubuntu de OCI traen reglas `iptables` que rechazan todo excepto SSH. **No use `ufw`** en estas imágenes (puede romper las reglas que OCI necesita).

```bash
# Ver las reglas actuales (note la posición de la regla REJECT)
sudo iptables -L INPUT --line-numbers

# Insertar la regla del puerto 80 antes del REJECT (normalmente posición 6)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT

# Guardar para que persista tras reiniciar
sudo netfilter-persistent save
```

5.3. Verificar:

```bash
sudo iptables -L INPUT --line-numbers
```

**Resultado esperado:** la regla `ACCEPT tcp dpt:http` aparece **antes** de `REJECT`; en `http://[IP_PUBLICA]` desde su computador se ve la página por defecto de Nginx.

![Paso 5 – Regla de ingreso en la Security List](capturas/paso-05-security-list.png)
![Paso 5 – Reglas iptables](capturas/paso-05-iptables.png)
![Paso 5 – Página por defecto vía IP pública](capturas/paso-05-ip-publica.png)

---

## Paso 6 – Construir la página web y subirla a la instancia

**Requisitos que cumple el sitio:**

- [ ] Al menos tres secciones (Inicio, Servicios, Galería, Contacto)
- [ ] Imágenes
- [ ] CSS adaptable a móviles (media queries / flexbox / grid)
- [ ] Funcionalidad en JavaScript

6.1. Crear en **su computador** la siguiente estructura (el sitio trata sobre fútbol: "Pasión Fútbol"):

```
sitio/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── script.js
└── img/
    ├── balon.svg
    ├── cancha.svg
    ├── estadio.svg
    └── porteria.svg
```

**Secciones del sitio:** Inicio (portada), El juego (posiciones y datos), Galería (imágenes ampliables) y Marcador (funcionalidad en JavaScript).

6.2. `index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Sitio sobre fútbol: historia, posiciones, galería y marcador interactivo.">
  <title>Pasión Fútbol</title>
  <link rel="icon" href="img/balon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <!-- ===== ENCABEZADO Y MENÚ ===== -->
  <header class="header">
    <a href="#inicio" class="logo">
      <img src="img/balon.svg" alt="" width="34" height="34">
      <span>Pasión <strong>Fútbol</strong></span>
    </a>
    <button id="menu-btn" class="menu-btn" aria-label="Abrir menú" aria-expanded="false">☰</button>
    <nav id="menu" class="nav">
      <a href="#inicio">Inicio</a>
      <a href="#juego">El juego</a>
      <a href="#galeria">Galería</a>
      <a href="#marcador">Marcador</a>
    </nav>
  </header>

  <main>
    <!-- ===== SECCIÓN 1: INICIO ===== -->
    <section id="inicio" class="hero">
      <div class="hero-texto">
        <p class="etiqueta">El deporte más popular del mundo</p>
        <h1>Vive la pasión del fútbol</h1>
        <p>Once jugadores, un balón y noventa minutos para dejarlo todo en la cancha. Conoce las posiciones, mira nuestra galería y lleva el marcador de tu propio partido.</p>
        <a href="#marcador" class="boton">Ir al marcador</a>
      </div>
      <img class="hero-img" src="img/cancha.svg" alt="Ilustración de una cancha de fútbol vista desde arriba">
    </section>

    <!-- ===== SECCIÓN 2: EL JUEGO ===== -->
    <section id="juego" class="seccion">
      <h2>El juego</h2>
      <p class="intro">Cada equipo tiene once jugadores en la cancha y cada posición cumple una función distinta.</p>

      <div class="tarjetas">
        <article class="tarjeta">
          <span class="icono">🧤</span>
          <h3>Portero</h3>
          <p>Último defensor del equipo. Es el único que puede usar las manos dentro de su área.</p>
        </article>
        <article class="tarjeta">
          <span class="icono">🛡️</span>
          <h3>Defensa</h3>
          <p>Protege su arco, recupera balones y frena los ataques del rival.</p>
        </article>
        <article class="tarjeta">
          <span class="icono">🔄</span>
          <h3>Mediocampista</h3>
          <p>Conecta la defensa con el ataque, distribuye el juego y controla el ritmo del partido.</p>
        </article>
        <article class="tarjeta">
          <span class="icono">⚡</span>
          <h3>Delantero</h3>
          <p>Su misión principal es crear oportunidades y convertir goles.</p>
        </article>
      </div>

      <div class="datos">
        <div><strong>90'</strong><span>Minutos de juego</span></div>
        <div><strong>11</strong><span>Jugadores por equipo</span></div>
        <div><strong>1863</strong><span>Primeras reglas oficiales</span></div>
      </div>
    </section>

    <!-- ===== SECCIÓN 3: GALERÍA ===== -->
    <section id="galeria" class="seccion seccion-alt">
      <h2>Galería</h2>
      <p class="intro">Toca una imagen para verla en grande.</p>
      <div class="galeria">
        <figure>
          <img src="img/estadio.svg" alt="Estadio de fútbol iluminado de noche">
          <figcaption>El estadio</figcaption>
        </figure>
        <figure>
          <img src="img/porteria.svg" alt="Balón entrando a la portería">
          <figcaption>¡Gol!</figcaption>
        </figure>
        <figure>
          <img src="img/balon.svg" alt="Balón de fútbol clásico">
          <figcaption>El balón</figcaption>
        </figure>
        <figure>
          <img src="img/cancha.svg" alt="Cancha de fútbol vista desde arriba">
          <figcaption>La cancha</figcaption>
        </figure>
      </div>
    </section>

    <!-- ===== SECCIÓN 4: MARCADOR INTERACTIVO (JavaScript) ===== -->
    <section id="marcador" class="seccion">
      <h2>Marcador del partido</h2>
      <p class="intro">Escribe los nombres de los equipos, inicia el cronómetro y registra cada gol.</p>

      <div class="tablero">
        <div class="equipo">
          <input id="nombre-local" type="text" value="Local" maxlength="15" aria-label="Nombre del equipo local">
          <span id="goles-local" class="goles">0</span>
          <button class="boton-gol" data-equipo="local">+ Gol</button>
        </div>

        <div class="centro">
          <span id="reloj" class="reloj">00:00</span>
          <span id="estado" class="estado">Sin iniciar</span>
          <div class="controles">
            <button id="btn-iniciar" class="boton">Iniciar</button>
            <button id="btn-reiniciar" class="boton boton-secundario">Reiniciar</button>
          </div>
        </div>

        <div class="equipo">
          <input id="nombre-visitante" type="text" value="Visitante" maxlength="15" aria-label="Nombre del equipo visitante">
          <span id="goles-visitante" class="goles">0</span>
          <button class="boton-gol" data-equipo="visitante">+ Gol</button>
        </div>
      </div>

      <h3 class="titulo-historial">Historial de goles</h3>
      <ul id="historial" class="historial">
        <li class="vacio">Aún no hay goles.</li>
      </ul>
    </section>
  </main>

  <!-- Ventana para ampliar imágenes de la galería -->
  <div id="visor" class="visor" hidden>
    <button id="cerrar-visor" class="cerrar" aria-label="Cerrar">✕</button>
    <img id="visor-img" src="" alt="">
  </div>

  <footer class="footer">
    <p>© <span id="anio"></span> Pasión Fútbol · Servido con Nginx en Oracle Cloud</p>
  </footer>

  <script src="js/script.js"></script>
</body>
</html>
```

6.3. `css/styles.css` (diseño adaptable con media queries para tablet y móvil):

```css
/* ===== Variables de color ===== */
:root {
  --verde: #0f7a3d;
  --verde-oscuro: #0a4d27;
  --verde-claro: #e8f5ec;
  --amarillo: #f5c518;
  --texto: #1b1f1d;
  --gris: #5b6660;
  --blanco: #ffffff;
  --sombra: 0 6px 20px rgba(0, 0, 0, 0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: "Inter", system-ui, sans-serif;
  color: var(--texto);
  background: var(--blanco);
  line-height: 1.6;
}

img { max-width: 100%; display: block; }

h1, h2 {
  font-family: "Bebas Neue", Impact, sans-serif;
  letter-spacing: 1px;
  line-height: 1.1;
}

/* ===== Encabezado ===== */
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 0.8rem 2rem;
  background: var(--verde-oscuro);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--blanco);
  text-decoration: none;
  font-size: 1.2rem;
}
.logo strong { color: var(--amarillo); }

.nav a {
  color: var(--blanco);
  text-decoration: none;
  margin-left: 1.5rem;
  font-weight: 600;
  transition: color 0.2s;
}
.nav a:hover { color: var(--amarillo); }

.menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--blanco);
  font-size: 1.8rem;
  cursor: pointer;
}

/* ===== Sección Inicio ===== */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 2rem;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, var(--verde-oscuro), var(--verde));
  color: var(--blanco);
}
.hero-texto { max-width: 540px; margin-left: auto; }
.hero h1 { font-size: 4rem; margin: 0.5rem 0 1rem; }
.hero p { opacity: 0.9; }
.hero-img {
  max-width: 480px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
.etiqueta {
  display: inline-block;
  background: var(--amarillo);
  color: var(--verde-oscuro);
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.2rem 0.8rem;
  border-radius: 999px;
}

/* ===== Botones ===== */
.boton {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.75rem 1.6rem;
  background: var(--amarillo);
  color: var(--verde-oscuro);
  font-weight: 700;
  border: none;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s;
}
.boton:hover { transform: translateY(-2px); }
.boton-secundario { background: #dfe5e1; color: var(--texto); }

/* ===== Secciones generales ===== */
.seccion { padding: 4rem 2rem; max-width: 1100px; margin: auto; }
.seccion-alt { max-width: none; background: var(--verde-claro); }
.seccion-alt > * { max-width: 1100px; margin-left: auto; margin-right: auto; }
.seccion h2 { font-size: 2.8rem; color: var(--verde-oscuro); text-align: center; }
.intro { text-align: center; color: var(--gris); margin: 0.5rem auto 2rem; }

/* ===== Tarjetas de posiciones ===== */
.tarjetas {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.2rem;
}
.tarjeta {
  background: var(--blanco);
  border: 1px solid #e3e8e5;
  border-top: 4px solid var(--verde);
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: var(--sombra);
}
.icono { font-size: 2rem; }
.tarjeta h3 { margin: 0.5rem 0; color: var(--verde-oscuro); }
.tarjeta p { color: var(--gris); font-size: 0.95rem; }

.datos {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-top: 2.5rem;
  text-align: center;
}
.datos strong {
  display: block;
  font-family: "Bebas Neue", Impact, sans-serif;
  font-size: 3rem;
  color: var(--verde);
}
.datos span { color: var(--gris); font-size: 0.9rem; }

/* ===== Galería ===== */
.galeria {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.galeria figure {
  background: var(--blanco);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--sombra);
  cursor: zoom-in;
}
.galeria img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  transition: transform 0.3s;
}
.galeria figure:hover img { transform: scale(1.05); }
.galeria figcaption { padding: 0.6rem; text-align: center; font-weight: 600; }

/* Visor de imágenes */
.visor {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.85);
}
.visor[hidden] { display: none; }
.visor img { max-height: 85vh; border-radius: 10px; }
.cerrar {
  position: absolute;
  top: 1rem;
  right: 1.2rem;
  background: none;
  border: none;
  color: var(--blanco);
  font-size: 2rem;
  cursor: pointer;
}

/* ===== Marcador ===== */
.tablero {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: var(--verde-oscuro);
  border-radius: 16px;
  color: var(--blanco);
  box-shadow: var(--sombra);
}
.equipo { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; }
.equipo input {
  width: 100%;
  max-width: 200px;
  padding: 0.5rem;
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
  border: 2px solid transparent;
  border-radius: 8px;
}
.equipo input:focus { outline: none; border-color: var(--amarillo); }
.goles {
  font-family: "Bebas Neue", Impact, sans-serif;
  font-size: 5rem;
  line-height: 1;
  color: var(--amarillo);
}
.goles.animar { animation: pulso 0.5s; }
@keyframes pulso {
  50% { transform: scale(1.4); }
}
.boton-gol {
  padding: 0.6rem 1.4rem;
  background: var(--verde);
  color: var(--blanco);
  font-weight: 700;
  border: 2px solid var(--blanco);
  border-radius: 8px;
  cursor: pointer;
}
.boton-gol:hover { background: var(--blanco); color: var(--verde-oscuro); }
.boton-gol:disabled { opacity: 0.4; cursor: not-allowed; }

.centro { display: flex; flex-direction: column; align-items: center; }
.reloj {
  font-family: "Bebas Neue", Impact, sans-serif;
  font-size: 3rem;
  background: #000;
  padding: 0.2rem 1rem;
  border-radius: 8px;
}
.estado { margin-top: 0.4rem; font-size: 0.9rem; opacity: 0.85; }
.controles { display: flex; gap: 0.5rem; }
.controles .boton { margin-top: 1rem; padding: 0.6rem 1rem; }

.titulo-historial { margin: 2rem 0 0.8rem; color: var(--verde-oscuro); }
.historial { list-style: none; }
.historial li {
  padding: 0.6rem 1rem;
  border-left: 4px solid var(--verde);
  background: var(--verde-claro);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}
.historial .vacio { border-left-color: #ccc; background: #f4f4f4; color: var(--gris); }

/* ===== Pie de página ===== */
.footer {
  text-align: center;
  padding: 1.5rem;
  background: var(--verde-oscuro);
  color: var(--blanco);
  font-size: 0.9rem;
}

/* ===== RESPONSIVE: Tablets ===== */
@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; text-align: center; }
  .hero-texto { margin: auto; }
  .hero-img { margin: auto; }
  .tarjetas, .galeria { grid-template-columns: repeat(2, 1fr); }
}

/* ===== RESPONSIVE: Móviles ===== */
@media (max-width: 600px) {
  .header { padding: 0.8rem 1rem; }
  .menu-btn { display: block; }
  .nav { display: none; width: 100%; flex-direction: column; padding-top: 0.5rem; }
  .nav.abierto { display: flex; }
  .nav a { margin: 0.5rem 0; }

  .hero { padding: 2.5rem 1rem; }
  .hero h1 { font-size: 2.8rem; }
  .seccion { padding: 2.5rem 1rem; }
  .seccion h2 { font-size: 2.2rem; }

  .tarjetas, .galeria { grid-template-columns: 1fr; }
  .datos { flex-direction: column; gap: 1rem; }

  .tablero { grid-template-columns: 1fr; padding: 1.5rem 1rem; }
  .centro { order: -1; }
  .goles { font-size: 4rem; }
}
```

6.4. `js/script.js` (menú móvil, visor de galería y marcador con cronómetro e historial de goles):

```javascript
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
```

6.5. Las imágenes de `sitio/img/` son ilustraciones propias en formato SVG incluidas en el proyecto.

6.6. Subir la carpeta a la instancia **desde su computador** (en otra terminal, no dentro de la sesión SSH):

```bash
scp -i ssh-key-[fecha].key -r ./sitio ubuntu@[IP_PUBLICA]:~/
```

> Alternativa: subir el sitio a un repositorio de GitHub y en la instancia ejecutar `git clone [url-del-repo] ~/sitio`.

6.7. Verificar en la instancia:

```bash
ls -R ~/sitio
```

**Resultado esperado:** los archivos del sitio aparecen en `/home/ubuntu/sitio`.

![Paso 6 – Estructura local del sitio](capturas/paso-06-estructura.png)
![Paso 6 – Subida con scp](capturas/paso-06-scp.png)

---

## Paso 7 – Configurar el sitio en Nginx

7.1. Crear el directorio del sitio y copiar los archivos:

```bash
sudo mkdir -p /var/www/mi-sitio
sudo cp -r ~/sitio/* /var/www/mi-sitio/
sudo chown -R www-data:www-data /var/www/mi-sitio
sudo chmod -R 755 /var/www/mi-sitio
```

7.2. Crear el bloque de servidor:

```bash
sudo nano /etc/nginx/sites-available/mi-sitio
```

Contenido:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name [misubdominio].duckdns.org [IP_PUBLICA];

    root /var/www/mi-sitio;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    access_log /var/log/nginx/mi-sitio.access.log;
    error_log  /var/log/nginx/mi-sitio.error.log;
}
```

7.3. Activar el sitio, desactivar el sitio por defecto y recargar:

```bash
sudo ln -s /etc/nginx/sites-available/mi-sitio /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**Resultado esperado:** `nginx -t` muestra `syntax is ok` y `test is successful`; en `http://[IP_PUBLICA]` se ve el sitio propio.

![Paso 7 – Server block](capturas/paso-07-server-block.png)
![Paso 7 – nginx -t](capturas/paso-07-nginx-test.png)
![Paso 7 – Sitio por IP pública](capturas/paso-07-sitio-ip.png)

---

## Paso 8 – Crear el subdominio en DuckDNS

8.1. Ingresar a https://www.duckdns.org e iniciar sesión (GitHub, Google, etc.).

8.2. Escribir el nombre del subdominio (ej. `[misubdominio]`) y presionar **add domain**.

8.3. En **current ip** escribir la IP pública de la instancia `[IP_PUBLICA]` y presionar **update ip**.

> A diferencia de una VM local, en OCI **no se necesita reenvío de puertos**: la instancia ya tiene IP pública.

8.4. Copiar el **token** de la cuenta (no publicarlo; en la guía y capturas usar `[TOKEN]`).

8.5. Verificar la resolución DNS desde su computador:

```bash
nslookup [misubdominio].duckdns.org
```

**Resultado esperado:** el subdominio resuelve a `[IP_PUBLICA]`.

![Paso 8 – Subdominio creado](capturas/paso-08-duckdns-dominio.png)
![Paso 8 – nslookup](capturas/paso-08-nslookup.png)

---

## Paso 9 – Actualización automática de la IP en DuckDNS

**Descripción:** si la instancia usa IP efímera y se recrea o se cambia la VNIC, la IP puede cambiar. El script mantiene DuckDNS sincronizado.

9.1. Crear el script en la instancia:

```bash
mkdir -p ~/duckdns && cd ~/duckdns
nano duck.sh
```

Contenido de `duck.sh`:

```bash
#!/bin/bash
# Con "ip=" vacío, DuckDNS registra la IP pública desde la que llega la petición (la de la instancia)
echo url="https://www.duckdns.org/update?domains=[misubdominio]&token=[TOKEN]&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

9.2. Dar permisos y probar:

```bash
chmod 700 duck.sh
./duck.sh
cat duck.log
```

9.3. Programar la ejecución cada 5 minutos:

```bash
crontab -e
```

Agregar la línea:

```
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

**Resultado esperado:** `duck.log` contiene `OK`.

![Paso 9 – Script y log OK](capturas/paso-09-duck-ok.png)
![Paso 9 – Crontab](capturas/paso-09-crontab.png)

---

## Paso 10 – Pruebas desde un navegador externo

10.1. Desde su computador y desde un **celular con datos móviles** (fuera de cualquier red local), abrir:

```
http://[misubdominio].duckdns.org
```

10.2. Probar desde la terminal de su computador:

```bash
curl -I http://[misubdominio].duckdns.org
```

10.3. Comprobar el diseño adaptable (celular real o herramientas de desarrollador → modo dispositivo) y la funcionalidad de JavaScript (menú, modo oscuro, formulario).

10.4. Revisar en la instancia que las visitas quedan registradas:

```bash
sudo tail -f /var/log/nginx/mi-sitio.access.log
```

**Lista de verificación:**

- [ ] El sitio carga por el subdominio de DuckDNS
- [ ] Se ve correctamente en escritorio
- [ ] Se ve correctamente en móvil
- [ ] El JavaScript funciona
- [ ] El log de Nginx registra la IP del cliente externo

![Paso 10 – Sitio en navegador de escritorio](capturas/paso-10-escritorio.png)
![Paso 10 – Sitio en celular](capturas/paso-10-celular.png)
![Paso 10 – Modo oscuro / formulario](capturas/paso-10-javascript.png)
![Paso 10 – Access log](capturas/paso-10-access-log.png)

---

## Problemas encontrados y soluciones

| # | Problema | Causa | Solución |
|---|---|---|---|
| 1 | [Ej. el navegador se queda cargando con la IP pública] | [Falta la regla TCP 80 en la Security List o en iptables] | [Paso 5: agregar ambas reglas] |
| 2 | [Ej. `Permission denied (publickey)` al conectar por SSH] | [Usuario incorrecto o permisos de la llave] | [Usar `ubuntu@` y restringir permisos de la llave] |
| 3 | [Ej. 403 Forbidden] | [Permisos de /var/www] | [chown www-data y chmod 755] |
| 4 | [Ej. *Out of capacity* al crear la instancia] | [Sin capacidad Always Free en ese AD] | [Cambiar de AD o de shape] |

## Conclusiones

- [Conclusión 1: qué aprendió sobre servidores web y Nginx]
- [Conclusión 2: sobre redes en la nube (VCN, Security Lists, IP pública) y DNS dinámico]
- [Conclusión 3: diferencias frente a una VM local y relación con despliegue continuo]

## Referencias

[Formato APA 7. Ejemplos a completar:]

- DuckDNS. (s. f.). *Install*. https://www.duckdns.org/install.jsp
- Oracle. (s. f.). *Oracle Cloud Infrastructure documentation*. https://docs.oracle.com/en-us/iaas/Content/home.htm
- Nginx. (s. f.). *nginx documentation*. https://nginx.org/en/docs/
