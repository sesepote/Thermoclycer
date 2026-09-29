# Simulador de termociclador

Monorepo con dos paquetes (npm workspaces):

```
packages/
  core/   → toda la lógica: conocimiento, reglas, cálculo, validación
            de protocolos y simulación. Sin nada de UI. Se testea con
            node --test.
  web/    → interfaz gráfica (Vite + React + TypeScript). Importa
            "@thermocycler/core" directamente desde su código fuente
            (ver packages/web/vite.config.ts), así que no hace falta
            compilar core aparte para desarrollar la web.
```

## Arrancar

Requiere Node 21 o superior. Desde la raíz del repo:

```bash
npm install          # instala todo (core + web) de una vez
npm run test:core    # compila y corre todos los tests de la lógica
npm run demo:core    # demo por consola de conocimiento + reglas + cálculo + validador
npm run dev:web      # arranca la interfaz gráfica en modo desarrollo
npm run build        # build de producción de la interfaz (packages/web/dist)
```

## Estructura de la web

```
src/
  App.tsx              carcasa del equipo + pantalla (barra de estado y vista activa)
  views/index.ts       registro de pantallas (iconos de inicio, rutas #/id, carga diferida)
  views/HomeView.tsx   pantalla de inicio: telemetría, accesos en órbita, plantillas
  views/ProgramView    editor de protocolo + vista previa del perfil
  views/RunView        panel de ejecución: lecturas, etapas, perfil, placa, transporte
  views/*.tsx          resto de pantallas (primers, evaluación, sistema)
  state/simulation.ts  store externo: simulación, bucle rAF y rampas de bloque y tapa
  state/app.tsx        contexto: vista activa y borrador del editor
  components/device/   carcasa (LEDs, marco, frontal) y barra de estado
  components/run/      diagrama de etapas del panel de ejecución
  components/          piezas reutilizables (editor, perfil térmico, placa…)
  hooks/               usePressRepeat, useClock
  lib/                 conversión editor ⇄ protocolo, formato, base de conocimiento
```

### Cómo escalar

- **Nueva sección**: añadir una entrada en `views/index.ts`. Su icono en la pantalla de inicio (esfera en órbita o acceso en el dock), su título en la barra de estado y su ruta se generan solos, y la pantalla se carga en un chunk aparte.
- **Nueva plantilla de protocolo**: una entrada en `PROTOCOL_PRESETS` (`lib/editorState.ts`).
- **Nueva fase opcional del editor**: una entrada en `BEFORE_CYCLES`/`AFTER_CYCLES` (`components/ProtocolEditor.tsx`).
- **Nuevo tipo de entidad en la base de conocimiento**: un campo `Collection<T>` más en `KnowledgeBase`.
- **Nueva función de cálculo invocable desde reglas**: un `register()` más en `calculations/default-registry.ts`.

### Rendimiento

La simulación vive fuera de React (`state/simulation.ts`) y los componentes se suscriben con selectores, así que cada frame solo re-renderiza las lecturas grandes del panel, la barra del paso actual y el marcador del perfil térmico. Las temperaturas de la barra de estado se redondean a 0,1 °C en el selector, así que solo cambian cuando cambia el dígito. El resto (editor, placa de 96 pocillos, diagrama de etapas…) está memorizado.

### Pantalla táctil

- Objetivos de toque de 44–48 px en dispositivos táctiles (`@media (pointer: coarse)`); el `:hover` solo se aplica con ratón.
- Botones −/+ que repiten y aceleran al mantenerlos pulsados.
- La interfaz imita un termociclador de sobremesa: carcasa gris con LEDs, pantalla táctil con marco azul y frontal con USB. En móvil la carcasa desaparece y la pantalla del equipo ocupa todo el viewport.
- Navegación como en el equipo: pantalla de inicio con iconos grandes y botón de inicio siempre visible en la barra de estado; el botón "atrás" del sistema también navega.
- Los controles de ejecución quedan fijos al pie de la pantalla y detener pide confirmación.
- El perfil térmico se inspecciona arrastrando el dedo (o pasando el ratón).
- La tabla de evaluación se muestra como tarjetas en pantallas estrechas; se respetan las safe areas (notch) y la app es instalable (manifiesto web).

## Qué hay implementado (fases de la spec)

- **Fase 1** — modelo de datos (`core/src/knowledge/entities`)
- **Fase 2** — base de conocimiento (`core/src/knowledge/knowledge-base.ts`)
- **Fase 3** — motor de reglas (`core/src/rules`)
- **Fase 4** — motor de cálculo (`core/src/calculations`)
- **Fase 5** — validador de protocolos (`core/src/protocols`)
- **Fase 8** (parcial, lo justo para la UI) — simulación (`core/src/simulation`): máquina de estados + cálculo de temporización; el reloj lo lleva la web con `requestAnimationFrame`
- **Fase 9** — interfaz gráfica (`packages/web`): pantalla de inicio, editor de protocolo, panel de ejecución, laboratorio de primers, evaluación y base de conocimiento

## Qué falta

- **Fase 6** — generador de ejercicios (mutaciones controladas, dificultad, generación masiva con semilla)
- **Fase 7** — evaluador y sistema de puntuación ponderada (hoy `protocols/validator.ts` compara parámetros y la vista de evaluación solo cuenta cuántos pasan)
- **Fase 10** — más tests automatizados, sobre todo de integración end-to-end y de la web

La interfaz permite construir y simular un protocolo "a mano", pero todavía no hay modo ejercicio (enunciado → respuesta del usuario → corrección con nota).
