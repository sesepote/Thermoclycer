import { useState, useEffect, useRef, useCallback } from 'react';
import { PCRProtocol, MachineRunState, RunProgressState } from '../types/pcr';
import { playStepChime, playRunCompleteAlarm } from '../utils/audio';

interface UsePCRRunnerOptions {
  protocol: PCRProtocol;
  onComplete?: () => void;
}

export function usePCRRunner({ protocol, onComplete }: UsePCRRunnerOptions) {
  const [state, setState] = useState<MachineRunState>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [stepElapsedSeconds, setStepElapsedSeconds] = useState<number>(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [currentBlockTemp, setCurrentBlockTemp] = useState<number>(25.0);
  const [currentLidTemp, setCurrentLidTemp] = useState<number>(25.0);
  const [isRamping, setIsRamping] = useState<boolean>(false);
  const [rampVelocity, setRampVelocity] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(5); // default 5x for great UX

  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Current active step
  const activeStep = protocol.steps[currentStepIndex] || protocol.steps[0];
  
  // Calculate target temperature for active step (accounting for touchdown / temp increments)
  const getStepTargetTemp = useCallback((stepIdx: number, cycle: number) => {
    const step = protocol.steps[stepIdx];
    if (!step) return 25.0;
    let target = step.temperature;
    if (step.tempIncrement && cycle > 1) {
      target += step.tempIncrement * (cycle - 1);
    }
    return Math.max(4, Math.min(100, target));
  }, [protocol]);

  // Calculate target duration for active step (accounting for time increments)
  const getStepDuration = useCallback((stepIdx: number, cycle: number) => {
    const step = protocol.steps[stepIdx];
    if (!step) return 30;
    if (step.isInfiniteHold) return 0;
    let dur = step.durationSeconds;
    if (step.timeIncrement && cycle > 1) {
      dur += step.timeIncrement * (cycle - 1);
    }
    return Math.max(1, dur);
  }, [protocol]);

  const activeLoop = protocol.loops.find(
    (l) => currentStepIndex >= l.startStepIndex && currentStepIndex <= l.endStepIndex
  );

  const totalCyclesInCurrentLoop = activeLoop ? activeLoop.repeatCount : 1;

  // Calculate estimated total remaining time
  const calculateRemainingTime = useCallback(() => {
    if (state === 'idle' || state === 'completed') return 0;
    if (activeStep?.isInfiniteHold) return 0;

    let totalSecondsLeft = 0;
    const currentStepDuration = getStepDuration(currentStepIndex, currentCycle);
    const currentStepLeft = Math.max(0, currentStepDuration - stepElapsedSeconds);
    totalSecondsLeft += currentStepLeft;

    // Remaining steps in current cycle
    const loop = protocol.loops.find(
      (l) => currentStepIndex >= l.startStepIndex && currentStepIndex <= l.endStepIndex
    );

    if (loop) {
      // remaining in this cycle
      for (let i = currentStepIndex + 1; i <= loop.endStepIndex; i++) {
        totalSecondsLeft += getStepDuration(i, currentCycle) + 10; // add ~10s average ramp
      }
      // remaining full cycles in this loop
      const remainingCycles = loop.repeatCount - currentCycle;
      if (remainingCycles > 0) {
        let oneCycleDur = 0;
        for (let i = loop.startStepIndex; i <= loop.endStepIndex; i++) {
          oneCycleDur += getStepDuration(i, currentCycle + 1) + 10;
        }
        totalSecondsLeft += oneCycleDur * remainingCycles;
      }
      // post-loop steps
      for (let i = loop.endStepIndex + 1; i < protocol.steps.length; i++) {
        if (!protocol.steps[i].isInfiniteHold) {
          totalSecondsLeft += getStepDuration(i, 1) + 10;
        }
      }
    } else {
      // outside loop
      for (let i = currentStepIndex + 1; i < protocol.steps.length; i++) {
        if (!protocol.steps[i].isInfiniteHold) {
          totalSecondsLeft += getStepDuration(i, 1) + 10;
        }
      }
    }

    return Math.max(0, Math.round(totalSecondsLeft));
  }, [activeStep, currentStepIndex, currentCycle, stepElapsedSeconds, protocol, getStepDuration, state]);

  // Start run
  const startRun = useCallback(() => {
    if (protocol.lidHeatingEnabled && currentLidTemp < (protocol.lidTemperature - 1)) {
      setState('preheating_lid');
    } else {
      setState('running');
    }
    setCurrentStepIndex(0);
    setCurrentCycle(1);
    setStepElapsedSeconds(0);
    setTotalElapsedSeconds(0);
    setIsRamping(true);
    lastTickRef.current = Date.now();
  }, [protocol, currentLidTemp]);

  const pauseRun = useCallback(() => {
    if (state === 'running' || state === 'preheating_lid') {
      setState('paused');
    }
  }, [state]);

  const resumeRun = useCallback(() => {
    if (state === 'paused') {
      lastTickRef.current = Date.now();
      setState('running');
    }
  }, [state]);

  const stopRun = useCallback(() => {
    setState('idle');
    setCurrentStepIndex(0);
    setCurrentCycle(1);
    setStepElapsedSeconds(0);
    setIsRamping(false);
    setRampVelocity(0);
  }, []);

  const skipPreheatingLid = useCallback(() => {
    if (state === 'preheating_lid') {
      setCurrentLidTemp(protocol.lidTemperature);
      setState('running');
    }
  }, [state, protocol.lidTemperature]);

  // Advance to next step or next cycle
  const advanceStep = useCallback(() => {
    playStepChime();
    const currentLoop = protocol.loops.find(
      (l) => currentStepIndex >= l.startStepIndex && currentStepIndex <= l.endStepIndex
    );

    if (currentLoop && currentStepIndex === currentLoop.endStepIndex) {
      if (currentCycle < currentLoop.repeatCount) {
        // Repeat loop
        setCurrentCycle((prev) => prev + 1);
        setCurrentStepIndex(currentLoop.startStepIndex);
        setStepElapsedSeconds(0);
        setIsRamping(true);
        return;
      }
    }

    // Otherwise next linear step
    if (currentStepIndex + 1 < protocol.steps.length) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setStepElapsedSeconds(0);
      setIsRamping(true);

      if (protocol.steps[nextIdx].isInfiniteHold) {
        setState('holding');
        playRunCompleteAlarm();
      }
    } else {
      // Completed all steps!
      setState('completed');
      setIsRamping(false);
      playRunCompleteAlarm();
      onComplete?.();
    }
  }, [currentStepIndex, currentCycle, protocol, onComplete]);

  // Simulation tick loop
  useEffect(() => {
    if (state === 'idle' || state === 'paused' || state === 'completed') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 100; // 10 updates per second
    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const realDeltaSec = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      const simDeltaSec = realDeltaSec * simSpeed;

      // Handle Lid Preheating state
      if (state === 'preheating_lid') {
        setCurrentLidTemp((prev) => {
          const lidTarget = protocol.lidTemperature;
          const rampSpeed = 2.5 * simDeltaSec; // 2.5°C/s lid ramp
          if (prev < lidTarget) {
            const nextLid = Math.min(lidTarget, prev + rampSpeed);
            if (nextLid >= lidTarget - 0.5) {
              setState('running');
              return lidTarget;
            }
            return nextLid;
          }
          setState('running');
          return lidTarget;
        });
        return;
      }

      // Keep Lid at target temperature during run
      if (protocol.lidHeatingEnabled) {
        setCurrentLidTemp((prev) => {
          const diff = protocol.lidTemperature - prev;
          if (Math.abs(diff) < 0.1) {
            // tiny oscillation
            return Number((protocol.lidTemperature + (Math.random() * 0.2 - 0.1)).toFixed(1));
          }
          return prev + Math.sign(diff) * Math.min(Math.abs(diff), 2.0 * simDeltaSec);
        });
      }

      // Step execution and block temperature ramp
      const targetTemp = getStepTargetTemp(currentStepIndex, currentCycle);
      const stepDuration = getStepDuration(currentStepIndex, currentCycle);
      const isHold = activeStep?.isInfiniteHold;

      setCurrentBlockTemp((prevBlock) => {
        const deltaTemp = targetTemp - prevBlock;
        const rampRate = (activeStep?.rampRate || 3.5) * simDeltaSec;

        if (Math.abs(deltaTemp) > 0.2) {
          // Still ramping to target temperature
          setIsRamping(true);
          const vel = Math.sign(deltaTemp) * (activeStep?.rampRate || 3.5);
          setRampVelocity(Number(vel.toFixed(1)));
          return prevBlock + Math.sign(deltaTemp) * Math.min(Math.abs(deltaTemp), rampRate);
        } else {
          // Reached target temperature plateau
          setIsRamping(false);
          setRampVelocity(0);
          
          // Realistic Peltier micro-fluctuation (+/- 0.04°C)
          const jitter = (Math.random() * 0.08 - 0.04);
          const stabilized = Number((targetTemp + jitter).toFixed(1));

          // Increment timers once at target temperature
          setTotalElapsedSeconds((t) => t + simDeltaSec);

          if (!isHold) {
            setStepElapsedSeconds((prevElapsed) => {
              const nextElapsed = prevElapsed + simDeltaSec;
              if (nextElapsed >= stepDuration) {
                // Step duration finished!
                advanceStep();
                return 0;
              }
              return nextElapsed;
            });
          }

          return stabilized;
        }
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    state,
    simSpeed,
    currentStepIndex,
    currentCycle,
    protocol,
    activeStep,
    getStepTargetTemp,
    getStepDuration,
    advanceStep,
  ]);

  const targetBlockTemp = getStepTargetTemp(currentStepIndex, currentCycle);
  const targetDuration = getStepDuration(currentStepIndex, currentCycle);
  const stepRemainingSeconds = activeStep?.isInfiniteHold 
    ? 0 
    : Math.max(0, targetDuration - stepElapsedSeconds);

  const progressState: RunProgressState = {
    state,
    currentStepIndex,
    currentCycle,
    totalCyclesInCurrentLoop,
    loopId: activeLoop ? activeLoop.id : null,
    stepElapsedSeconds: Math.floor(stepElapsedSeconds),
    stepRemainingSeconds: Math.floor(stepRemainingSeconds),
    totalElapsedSeconds: Math.floor(totalElapsedSeconds),
    estimatedRemainingSeconds: calculateRemainingTime(),
    currentBlockTemp: Number(currentBlockTemp.toFixed(1)),
    targetBlockTemp: Number(targetBlockTemp.toFixed(1)),
    currentLidTemp: Number(currentLidTemp.toFixed(1)),
    targetLidTemp: protocol.lidHeatingEnabled ? protocol.lidTemperature : 25.0,
    isRamping,
    rampVelocity,
    simSpeed,
  };

  return {
    progressState,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
    advanceStep,
    skipPreheatingLid,
    setSimSpeed,
    setCurrentBlockTemp,
    setCurrentLidTemp,
  };
}
