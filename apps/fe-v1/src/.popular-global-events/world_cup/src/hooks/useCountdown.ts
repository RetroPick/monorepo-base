import { useState, useEffect, useRef } from 'react';

interface CountdownTime {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export function useCountdown(targetDate: Date): CountdownTime {
  const calculateTimeLeft = (): CountdownTime => {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const diff = Math.max(0, target - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft);
  const prevSecondsRef = useRef(timeLeft.seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const newTime = calculateTimeLeft();
      if (newTime.seconds !== prevSecondsRef.current) {
        prevSecondsRef.current = newTime.seconds;
        setTimeLeft(newTime);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetDate]);

  return timeLeft;
}
