import { useState, useEffect } from 'react';

export function useAnimatedCounter(end: number, duration: number = 1000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end <= 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(end * eased);

      setCount(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration]);

  return count;
}
