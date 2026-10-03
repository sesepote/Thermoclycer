import { useEffect, useState } from 'react';

const format = () => {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
};

// Reloj del equipo. Se consulta cada segundo, pero solo re-renderiza
// cuando cambia el minuto (misma cadena → React descarta la actualización).
export function useClock() {
  const [time, setTime] = useState(() => format().time);
  const [date, setDate] = useState(() => format().date);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = format();
      setTime(next.time);
      setDate(next.date);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return { time, date };
}
