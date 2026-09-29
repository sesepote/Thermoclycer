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
  App.tsx              armazón: cabecera, vista activa, gesto de deslizar
  views/index.ts       registro de vistas (pestañas, rutas #/id, carga diferida)
  views/*.tsx          una vista por sección
  state/simulation.ts  store externo de la simulación con su propio bucle rAF
  state/app.tsx        contexto: vista activa y borrador del editor
  components/          piezas reutilizables (editor, panel del equipo, perfil…)
  hooks/               useRampedValue, usePressRepeat, useSwipe
  lib/                 conversión editor ⇄ protocolo, formato, base de conocimiento
```

### Cómo escalar

- **Nueva sección**: añadir una entrada en `views/index.ts`. La pestaña, la barra inferior, el gesto de deslizar y la ruta se generan solos, y la vista se carga en un chunk aparte.
- **Nueva plantilla de protocolo**: una entrada en `PROTOCOL_PRESETS` (`lib/editorState.ts`).
- **Nueva fase opcional del editor**: una entrada en `BEFORE_CYCLES`/`AFTER_CYCLES` (`components/ProtocolEditor.tsx`).
- **Nuevo tipo de entidad en la base de conocimiento**: un campo `Collection<T>` más en `KnowledgeBase`.
- **Nueva función de cálculo invocable desde reglas**: un `register()` más en `calculations/default-registry.ts`.

### Rendimiento

La simulación vive fuera de React (`state/simulation.ts`) y los componentes se suscriben con selectores, así que cada frame solo re-renderiza las lecturas del display y el marcador del perfil térmico. El resto (editor, placa de 96 pocillos, pista de ciclos…) está memorizado.

### Pantalla táctil

- Objetivos de toque de 44–48 px en dispositivos táctiles (`@media (pointer: coarse)`); el `:hover` solo se aplica con ratón.
- Botones −/+ que repiten y aceleran al mantenerlos pulsados.
- En móvil la navegación pasa a una barra inferior; se puede deslizar a izquierda o derecha para cambiar de sección, y el botón "atrás" navega entre secciones.
- El perfil térmico se inspecciona arrastrando el dedo (o pasando el ratón).
- La tabla de evaluación se muestra como tarjetas en pantallas estrechas; se respetan las safe areas (notch) y la app es instalable (manifiesto web).

## Qué hay implementado (fases de la spec)

- **Fase 1** — modelo de datos (`core/src/knowledge/entities`)
- **Fase 2** — base de conocimiento (`core/src/knowledge/knowledge-base.ts`)
- **Fase 3** — motor de reglas (`core/src/rules`)
- **Fase 4** — motor de cálculo (`core/src/calculations`)
- **Fase 5** — validador de protocolos (`core/src/protocols`)
- **Fase 8** (parcial, lo justo para la UI) — simulación (`core/src/simulation`): máquina de estados + cálculo de temporización; el reloj lo lleva la web con `requestAnimationFrame`
- **Fase 9** — interfaz gráfica (`packages/web`): editor de protocolo, panel del dispositivo, laboratorio de primers, evaluación y base de conocimiento

## Qué falta

- **Fase 6** — generador de ejercicios (mutaciones controladas, dificultad, generación masiva con semilla)
- **Fase 7** — evaluador y sistema de puntuación ponderada (hoy `protocols/validator.ts` compara parámetros y la vista de evaluación solo cuenta cuántos pasan)
- **Fase 10** — más tests automatizados, sobre todo de integración end-to-end y de la web

La interfaz permite construir y simular un protocolo "a mano", pero todavía no hay modo ejercicio (enunciado → respuesta del usuario → corrección con nota).
