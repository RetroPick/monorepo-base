import { useRef, useEffect } from 'react';
import gsap from 'gsap';

const blobs = [
  { id: 1, size: 600, x: '-10%', y: '60%', color: 'radial-gradient(circle, #1A5E3F 0%, #0B2E1F 70%)' },
  { id: 2, size: 500, x: '70%', y: '10%', color: 'radial-gradient(circle, #1A5E3F 0%, #0B2E1F 70%)' },
  { id: 3, size: 700, x: '50%', y: '70%', color: 'radial-gradient(circle, #2D8B6B 0%, #0B2E1F 70%)' },
  { id: 4, size: 450, x: '80%', y: '50%', color: 'radial-gradient(circle, #164C33 0%, #0B2E1F 70%)' },
  { id: 5, size: 550, x: '20%', y: '20%', color: 'radial-gradient(circle, #1A5E3F 0%, #0B2E1F 70%)' },
];

export default function GradientBlobs() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const blobElements = containerRef.current.querySelectorAll('.blob');

    blobElements.forEach((blob, i) => {
      const targets = [
        { x: `${Math.random() * 30 - 15}%`, y: `${Math.random() * 30 - 15}%` },
        { x: `${Math.random() * 30 - 15}%`, y: `${Math.random() * 30 - 15}%` },
        { x: `${Math.random() * 30 - 15}%`, y: `${Math.random() * 30 - 15}%` },
      ];

      const tl = gsap.timeline({ repeat: -1, yoyo: true });

      targets.forEach((target) => {
        tl.to(blob, {
          x: target.x,
          y: target.y,
          scale: 0.9 + Math.random() * 0.2,
          duration: 15 + Math.random() * 10,
          ease: 'sine.inOut',
        });
      });

      tl.delay(i * 0.5);
    });

    return () => {
      gsap.killTweensOf(blobElements);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className="blob absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            left: blob.x,
            top: blob.y,
            background: blob.color,
            filter: 'blur(80px)',
            opacity: 0.7,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}
