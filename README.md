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

Desde la raíz del repo:

```bash
npm install          # instala todo (core + web) de una vez
npm run test:core    # compila y corre los tests de la lógica
npm run demo:core    # demo por consola de conocimiento + reglas + cálculo + validador
npm run dev:web      # arranca la interfaz gráfica en modo desarrollo
npm run build:web    # build de producción de la interfaz
```

`npm run dev:web` levanta un servidor local (normalmente en `http://localhost:5173`) con recarga en caliente. Cualquier cambio en `packages/core/src` se recompila junto con la web al vuelo.

## Qué hay implementado (fases de la spec)

- **Fase 1** — modelo de datos (`core/src/knowledge/entities`)
- **Fase 2** — base de conocimiento (`core/src/knowledge/knowledge-base.ts`)
- **Fase 3** — motor de reglas (`core/src/rules`)
- **Fase 4** — motor de cálculo (`core/src/calculations`)
- **Fase 5** — validador de protocolos (`core/src/protocols`)
- **Fase 8** (parcial, lo justo para la UI) — simulación (`core/src/simulation`): máquina de estados + cálculo de temporización, sin aceleración real de reloj (eso lo hace la web con `requestAnimationFrame`)
- **Fase 9** — interfaz gráfica (`packages/web`): editor de protocolo + panel del dispositivo

## Qué falta

- **Fase 6** — generador de ejercicios (mutaciones controladas, dificultad, generación masiva con semilla)
- **Fase 7** — evaluador y sistema de puntuación (hoy `protocols/validator.ts` compara parámetros, pero nadie pondera ni pone nota)
- **Fase 10** — más tests automatizados, sobre todo de integración end-to-end

La interfaz actual deja construir y simular un protocolo "a mano", pero no hay todavía modo ejercicio (enunciado → respuesta del usuario → corrección con nota).
