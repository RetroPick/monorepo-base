import { useEffect, useRef } from 'react';

export function useHeroCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const animRef = useRef<number>(0);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    function resize() {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx!.scale(dpr, dpr);
    }

    resize();

    // Dot grid setup
    const gridSize = 30;
    const baseDotRadius = 1.5;
    const dots: { x: number; y: number; phase: number }[] = [];

    for (let x = 0; x < width + gridSize; x += gridSize) {
      for (let y = 0; y < height * 0.7; y += gridSize) {
        dots.push({
          x,
          y,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // IntersectionObserver to pause when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );

    observer.observe(canvas);

    function draw(time: number) {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, width, height);

      // Draw dots
      dots.forEach((dot) => {
        const normalizedX = dot.x / width;
        const density = 1 - Math.abs(normalizedX - 0.5) * 0.6;
        const opacity =
          0.25 * density +
          0.15 * Math.sin(time * 0.001 + dot.phase);

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, baseDotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(126, 184, 255, ${Math.max(0.08, opacity)})`;
        ctx.fill();
      });

      // Draw horizon curve
      const curveY = height * 0.72;
      const curveDepth = height * 0.15;

      ctx.beginPath();
      ctx.moveTo(0, curveY + curveDepth * 0.3);
      ctx.quadraticCurveTo(
        width * 0.5,
        curveY + curveDepth,
        width,
        curveY + curveDepth * 0.3
      );
      ctx.strokeStyle = 'rgba(126, 184, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#7EB8FF';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Glow below curve
      const gradient = ctx.createLinearGradient(0, curveY, 0, height);
      gradient.addColorStop(0, 'rgba(126, 184, 255, 0.12)');
      gradient.addColorStop(0.5, 'rgba(126, 184, 255, 0.04)');
      gradient.addColorStop(1, 'rgba(126, 184, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(0, curveY + curveDepth * 0.3);
      ctx.quadraticCurveTo(
        width * 0.5,
        curveY + curveDepth,
        width,
        curveY + curveDepth * 0.3
      );
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    function animate(time: number) {
      if (isVisibleRef.current) {
        draw(time);
      }
      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      resize();
      // Rebuild dots on resize
      dots.length = 0;
      for (let x = 0; x < width + gridSize; x += gridSize) {
        for (let y = 0; y < height * 0.7; y += gridSize) {
          dots.push({
            x,
            y,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef]);
}
