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
  App.tsx              pantalla completa del equipo (barra de estado y vista activa)
  views/index.ts       registro de pantallas (iconos de inicio, rutas #/id, carga diferida)
  views/HomeView.tsx   pantalla de inicio: telemetría, accesos en órbita, plantillas
  views/ProgramView    editor de protocolo + vista previa del perfil
  views/RunView        termociclador (cycler/), montado de forma persistente
  views/*.tsx          resto de pantallas (primers, evaluación, sistema)
  cycler/              termociclador de Termociclador-solo sin su carcasa: editor táctil
                       del perfil, gradiente, bucles, biblioteca, monitor de corrida y
                       placa de 96 pocillos (Tailwind v4, acotado a esta carpeta);
                       cycler/store.ts guarda programa y biblioteca (zustand persist)
  state/instrument.ts  store (zustand): lecturas que el termociclador publica para la
                       barra de estado y el inicio
  state/app.ts         store (zustand): vista activa y borrador del editor
  components/device/   barra de estado
  components/          piezas reutilizables (editor, perfil térmico…)
  hooks/               usePressRepeat, useClock
  lib/                 conversión editor ⇄ protocolo ⇄ termociclador, formato, base de conocimiento
```

### Cómo escalar

- **Nueva sección**: añadir una entrada en `views/index.ts`. Su icono en la pantalla de inicio (esfera en órbita o acceso en el dock), su título en la barra de estado y su ruta se generan solos, y la pantalla se carga en un chunk aparte.
- **Nueva plantilla de protocolo**: una entrada en `PROTOCOL_PRESETS` (`lib/editorState.ts`).
- **Nueva fase opcional del editor**: una entrada en `BEFORE_CYCLES`/`AFTER_CYCLES` (`components/ProtocolEditor.tsx`).
- **Nuevo tipo de entidad en la base de conocimiento**: un campo `Collection<T>` más en `KnowledgeBase`.
- **Nueva función de cálculo invocable desde reglas**: un `register()` más en `calculations/default-registry.ts`.

### Rendimiento

El termociclador publica sus lecturas en `state/instrument.ts` y el resto de la interfaz se suscribe con selectores, así que la barra de estado y el inicio solo se re-renderizan cuando cambia el valor que muestran. El termociclador y sus estilos Tailwind viajan en un chunk diferido; la pantalla sigue montada (oculta) al navegar, para que una corrida no se pare.

### Pantalla táctil

- Objetivos de toque de 44–48 px en dispositivos táctiles (`@media (pointer: coarse)`); el `:hover` solo se aplica con ratón.
- Botones −/+ que repiten y aceleran al mantenerlos pulsados.
- La pantalla del equipo ocupa todo el viewport, sin carcasa ni marco.
- En el termociclador, la temperatura y el tiempo de cada paso se editan tocando sus etiquetas en el gráfico (área de toque ampliada, también con teclado). Los modales usan Radix Dialog: foco atrapado, Esc para cerrar y bloqueo del scroll.
- Navegación como en el equipo: pantalla de inicio con iconos grandes y botón de inicio siempre visible en la barra de estado; el botón "atrás" del sistema también navega.
- El termociclador tiene teclado numérico táctil, bucles de ciclos, gradiente por columnas, biblioteca de protocolos, pitidos de equipo y monitor de corrida con placa de 96 pocillos; abortar pide confirmación. "Cargar en el termociclador" en Programa le envía el protocolo del editor.
- El perfil térmico se inspecciona arrastrando el dedo (o pasando el ratón).
- La tabla de evaluación se muestra como tarjetas en pantallas estrechas; se respetan las safe areas (notch) y la app es instalable (manifiesto web).

## Qué hay implementado (fases de la spec)

- **Fase 1** — modelo de datos (`core/src/knowledge/entities`)
- **Fase 2** — base de conocimiento (`core/src/knowledge/knowledge-base.ts`)
- **Fase 3** — motor de reglas (`core/src/rules`)
- **Fase 4** — motor de cálculo (`core/src/calculations`)
- **Fase 5** — validador de protocolos (`core/src/protocols`)
- **Fase 8** (parcial, lo justo para la UI) — simulación (`core/src/simulation`): máquina de estados + cálculo de temporización (la web usa el motor propio del termociclador, `cycler/hooks/usePCRRunner.ts`)
- **Fase 9** — interfaz gráfica (`packages/web`): pantalla de inicio, editor de protocolo, termociclador, laboratorio de primers, evaluación y base de conocimiento

## Qué falta

- **Fase 6** — generador de ejercicios (mutaciones controladas, dificultad, generación masiva con semilla)
- **Fase 7** — evaluador y sistema de puntuación ponderada (hoy `protocols/validator.ts` compara parámetros y la vista de evaluación solo cuenta cuántos pasan)
- **Fase 10** — más tests automatizados, sobre todo de integración end-to-end y de la web

La interfaz permite construir y simular un protocolo "a mano", pero todavía no hay modo ejercicio (enunciado → respuesta del usuario → corrección con nota).
