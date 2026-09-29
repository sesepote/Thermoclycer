import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationController } from './state-machine';
import { Protocol } from '../knowledge/entities/protocol';

function protocoloValido(): Protocol {
  return {
    id: 'p1',
    cycles: {
      count: 2,
      steps: [{ type: 'denaturation', temperature: 95, durationSeconds: 10 }],
    },
  };
}

test('empieza en IDLE y pasa a PROGRAMMED al programar un protocolo válido', () => {
  const controller = new SimulationController();
  assert.equal(controller.snapshot().state, 'IDLE');
  const result = controller.program(protocoloValido());
  assert.equal(result.ok, true);
  assert.equal(controller.snapshot().state, 'PROGRAMMED');
});

test('programar un protocolo inválido deja el estado en ERROR y no en RUNNING', () => {
  const controller = new SimulationController();
  const invalido: Protocol = { id: 'p2', cycles: { count: 0, steps: [] } };
  const result = controller.program(invalido);
  assert.equal(result.ok, false);
  assert.equal(controller.snapshot().state, 'ERROR');
});

test('play/pause/play alternan correctamente el estado', () => {
  const controller = new SimulationController();
  controller.program(protocoloValido());
  controller.play();
  assert.equal(controller.snapshot().state, 'RUNNING');
  controller.pause();
  assert.equal(controller.snapshot().state, 'PAUSED');
  controller.play();
  assert.equal(controller.snapshot().state, 'RUNNING');
});

test('tick solo avanza el tiempo mientras el estado es RUNNING', () => {
  const controller = new SimulationController();
  controller.program(protocoloValido()); // 2 ciclos x 10s = 20s
  controller.tick(5); // en PROGRAMMED, no debería avanzar
  assert.equal(controller.snapshot().elapsedSeconds, 0);

  controller.play();
  controller.tick(5);
  assert.equal(controller.snapshot().elapsedSeconds, 5);
});

test('la velocidad multiplica el avance del tiempo', () => {
  const controller = new SimulationController();
  controller.program(protocoloValido());
  controller.setSpeed(10);
  controller.play();
  controller.tick(1); // 1s real x10 = 10s simulados
  assert.equal(controller.snapshot().elapsedSeconds, 10);
});

test('al llegar al final del protocolo el estado pasa a COMPLETED', () => {
  const controller = new SimulationController();
  controller.program(protocoloValido()); // 20s de duración total
  controller.play();
  controller.tick(100); // de sobra para terminar
  const snap = controller.snapshot();
  assert.equal(snap.state, 'COMPLETED');
  assert.equal(snap.elapsedSeconds, 20);
});

test('stop reinicia el tiempo transcurrido', () => {
  const controller = new SimulationController();
  controller.program(protocoloValido());
  controller.play();
  controller.tick(5);
  controller.stop();
  const snap = controller.snapshot();
  assert.equal(snap.state, 'STOPPED');
  assert.equal(snap.elapsedSeconds, 0);
});

test('tras detener o completar, play vuelve a empezar desde cero', () => {
  const controller = new SimulationController();
  controller.program(protocoloValido());
  controller.play();
  controller.tick(100);
  assert.equal(controller.snapshot().state, 'COMPLETED');
  controller.play();
  assert.equal(controller.snapshot().state, 'RUNNING');
  assert.equal(controller.snapshot().elapsedSeconds, 0);

  controller.tick(5);
  controller.stop();
  controller.play();
  assert.equal(controller.snapshot().state, 'RUNNING');
  assert.equal(controller.snapshot().elapsedSeconds, 0);
});

test('play sin protocolo programado no hace nada', () => {
  const controller = new SimulationController();
  controller.play();
  assert.equal(controller.snapshot().state, 'IDLE');
});
