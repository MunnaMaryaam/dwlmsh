import React, { useEffect, useRef } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Facet {
  indices: number[];
  baseColor: string;
  specular: number;
  type: 'table' | 'star' | 'kite' | 'upper-girdle' | 'pavilion' | 'lower-girdle';
}

export const RealisticDiamondCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Generate 3D Brilliant-Cut Diamond Vertices
    const vertices: Point3D[] = [];
    const R_GIRDLE = 140;
    const Y_TABLE = -72;
    const R_TABLE = 78;
    const Y_GIRDLE_TOP = -8;
    const Y_GIRDLE_BOTTOM = 8;
    const Y_CULET = 125;

    // 0: Culet (bottom point)
    vertices.push({ x: 0, y: Y_CULET, z: 0 });

    // 1-8: Table vertices (octagon)
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      vertices.push({
        x: Math.cos(angle) * R_TABLE,
        y: Y_TABLE,
        z: Math.sin(angle) * R_TABLE,
      });
    }

    // 9-24: Upper Girdle points (16 points)
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      vertices.push({
        x: Math.cos(angle) * R_GIRDLE,
        y: Y_GIRDLE_TOP,
        z: Math.sin(angle) * R_GIRDLE,
      });
    }

    // 25-40: Lower Girdle points (16 points)
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      vertices.push({
        x: Math.cos(angle) * (R_GIRDLE * 0.98),
        y: Y_GIRDLE_BOTTOM,
        z: Math.sin(angle) * (R_GIRDLE * 0.98),
      });
    }

    // Define Facets
    const facets: Facet[] = [];

    // Table facet
    facets.push({
      indices: [1, 2, 3, 4, 5, 6, 7, 8],
      baseColor: 'rgba(235, 245, 255, 0.45)',
      specular: 1.0,
      type: 'table',
    });

    // Star facets (8 triangles between table edge and star points on girdle)
    for (let i = 0; i < 8; i++) {
      const t1 = i + 1;
      const t2 = (i + 1) % 8 + 1;
      const g = 9 + i * 2;
      facets.push({
        indices: [t1, t2, g],
        baseColor: 'rgba(215, 238, 255, 0.35)',
        specular: 0.9,
        type: 'star',
      });
    }

    // Kite / Bezel facets (8 kites)
    for (let i = 0; i < 8; i++) {
      const t = i + 1;
      const gPrev = 9 + ((i * 2 - 1 + 16) % 16);
      const gMid = 9 + i * 2;
      const gNext = 9 + ((i * 2 + 1) % 16);
      facets.push({
        indices: [t, gPrev, gMid, gNext],
        baseColor: 'rgba(225, 240, 255, 0.38)',
        specular: 0.95,
        type: 'kite',
      });
    }

    // Upper girdle triangles (16 triangles)
    for (let i = 0; i < 16; i++) {
      const g1 = 9 + i;
      const g2 = 9 + ((i + 1) % 16);
      const t = Math.floor(i / 2) + 1;
      facets.push({
        indices: [g1, g2, t],
        baseColor: 'rgba(200, 230, 255, 0.28)',
        specular: 0.85,
        type: 'upper-girdle',
      });
    }

    // Pavilion main facets (8 kites to culet)
    for (let i = 0; i < 8; i++) {
      const g1 = 25 + i * 2;
      const g2 = 25 + ((i * 2 + 2) % 16);
      facets.push({
        indices: [0, g1, g2],
        baseColor: 'rgba(180, 215, 250, 0.3)',
        specular: 0.8,
        type: 'pavilion',
      });
    }

    // Lower girdle triangles (16 triangles)
    for (let i = 0; i < 16; i++) {
      const g1 = 25 + i;
      const g2 = 25 + ((i + 1) % 16);
      facets.push({
        indices: [0, g1, g2],
        baseColor: 'rgba(190, 225, 255, 0.25)',
        specular: 0.75,
        type: 'lower-girdle',
      });
    }

    // Floating micro-particles / Diamond dust
    const particleCount = 48;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 800,
      z: (Math.random() - 0.5) * 400,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.15 - Math.random() * 0.35,
      size: 1 + Math.random() * 2.2,
      opacity: 0.2 + Math.random() * 0.7,
      sparkleSpeed: 0.02 + Math.random() * 0.04,
      sparklePhase: Math.random() * Math.PI * 2,
      hue: Math.random() > 0.4 ? 'gold' : 'diamond',
    }));

    // Sparkle Glints (realistic prismatic dispersion fire)
    interface SparkleGlint {
      vertexIndex: number;
      intensity: number;
      hue: number;
      size: number;
    }
    const glints: SparkleGlint[] = [
      { vertexIndex: 1, intensity: 0, hue: 45, size: 24 },
      { vertexIndex: 5, intensity: 0, hue: 200, size: 28 },
      { vertexIndex: 12, intensity: 0, hue: 280, size: 32 },
      { vertexIndex: 18, intensity: 0, hue: 35, size: 22 },
      { vertexIndex: 22, intensity: 0, hue: 160, size: 26 },
      { vertexIndex: 0, intensity: 0, hue: 40, size: 30 },
    ];

    let rotY = 0;
    let rotX = 0.22; // subtle downward view showing table and depth
    let rotZ = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Mouse smoothing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      // Slow realistic continuous gem rotation + mouse parallax tilt
      rotY += 0.35 * dt;
      const targetRotX = 0.24 + mouseRef.current.y * 0.18;
      const targetRotZ = -mouseRef.current.x * 0.14;
      rotX += (targetRotX - rotX) * 0.06;
      rotZ += (targetRotZ - rotZ) * 0.06;

      ctx.clearRect(0, 0, width, height);

      const dpr = window.devicePixelRatio || 1;
      const centerX = width / 2;
      const centerY = height / 2 - 10 * dpr;
      const scale = Math.min(width, height) / 850;

      // 1. Draw Caustic Light Glow on Ground Plane
      const causticPulse = Math.sin(time * 0.0015) * 0.1 + 0.9;
      const causticGrad = ctx.createRadialGradient(
        centerX,
        centerY + 140 * scale * dpr,
        10 * scale * dpr,
        centerX,
        centerY + 140 * scale * dpr,
        240 * scale * dpr
      );
      causticGrad.addColorStop(0, `rgba(212, 175, 55, ${0.2 * causticPulse})`);
      causticGrad.addColorStop(0.35, `rgba(147, 197, 253, ${0.12 * causticPulse})`);
      causticGrad.addColorStop(0.7, `rgba(212, 175, 55, ${0.04 * causticPulse})`);
      causticGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = causticGrad;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY + 140 * scale * dpr,
        260 * scale * dpr,
        70 * scale * dpr,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 2. 3D Rotation Matrix Calculation
      const cosY = Math.cos(rotY),
        sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX),
        sinX = Math.sin(rotX);
      const cosZ = Math.cos(rotZ),
        sinZ = Math.sin(rotZ);

      const transformed: Array<Point3D & { px: number; py: number; depth: number }> =
        vertices.map((v) => {
          // Rotate Y
          let x1 = v.x * cosY + v.z * sinY;
          let y1 = v.y;
          let z1 = -v.x * sinY + v.z * cosY;

          // Rotate X
          let x2 = x1;
          let y2 = y1 * cosX - z1 * sinX;
          let z2 = y1 * sinX + z1 * cosX;

          // Rotate Z
          let x3 = x2 * cosZ - y2 * sinZ;
          let y3 = x2 * sinZ + y2 * cosZ;
          let z3 = z2;

          // Perspective Projection
          const fov = 750;
          const perspective = fov / (fov + z3);
          const px = centerX + x3 * scale * dpr * perspective;
          const py = centerY + y3 * scale * dpr * perspective;

          return { x: x3, y: y3, z: z3, px, py, depth: z3 };
        });

      // 3. Sort Facets by Average Depth (Painter's Algorithm)
      const sortedFacets = facets
        .map((facet) => {
          let sumZ = 0;
          for (const idx of facet.indices) {
            sumZ += transformed[idx].z;
          }
          const avgZ = sumZ / facet.indices.length;

          // Calculate surface normal for lighting / specular reflection
          const p0 = transformed[facet.indices[0]];
          const p1 = transformed[facet.indices[1]];
          const p2 = transformed[facet.indices[2] || facet.indices[0]];
          const v0 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
          const v1 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
          const nx = v0.y * v1.z - v0.z * v1.y;
          const ny = v0.z * v1.x - v0.x * v1.z;
          const nz = v0.x * v1.y - v0.y * v1.x;
          const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          const normalZ = nz / length;

          return { facet, avgZ, normalZ };
        })
        .sort((a, b) => b.avgZ - a.avgZ);

      // 4. Render Facets with Dispersion & Refraction Effects
      for (const { facet, normalZ } of sortedFacets) {
        if (facet.indices.length < 3) continue;

        ctx.beginPath();
        const first = transformed[facet.indices[0]];
        ctx.moveTo(first.px, first.py);
        for (let i = 1; i < facet.indices.length; i++) {
          const pt = transformed[facet.indices[i]];
          ctx.lineTo(pt.px, pt.py);
        }
        ctx.closePath();

        // Facet lighting calculation based on light source from top-right-front
        const lightIntensity = Math.max(0.1, normalZ * 0.7 + 0.3);
        const isFacingLight = normalZ > 0.4;
        const dispersionGlint = isFacingLight ? Math.pow(normalZ, 4) * 0.6 : 0;

        // Gradient shimmer per facet for realistic crystalline transmission
        const grad = ctx.createLinearGradient(
          transformed[facet.indices[0]].px,
          transformed[facet.indices[0]].py,
          transformed[facet.indices[1]].px,
          transformed[facet.indices[1]].py
        );

        if (facet.type === 'table') {
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.45 + dispersionGlint})`);
          grad.addColorStop(0.5, `rgba(225, 245, 255, ${0.35 + dispersionGlint})`);
          grad.addColorStop(1, `rgba(200, 225, 250, ${0.25 + dispersionGlint})`);
        } else if (facet.type === 'star' || facet.type === 'kite') {
          const goldTouch = Math.sin(rotY + facet.indices[0]) > 0.3 ? 20 : 0;
          grad.addColorStop(
            0,
            `rgba(${220 + goldTouch}, ${240 + goldTouch}, 255, ${0.35 * lightIntensity + dispersionGlint})`
          );
          grad.addColorStop(
            1,
            `rgba(180, 220, 250, ${0.18 * lightIntensity + dispersionGlint * 0.5})`
          );
        } else {
          grad.addColorStop(0, `rgba(200, 230, 255, ${0.25 * lightIntensity})`);
          grad.addColorStop(1, `rgba(160, 200, 245, ${0.12 * lightIntensity})`);
        }

        ctx.fillStyle = grad;
        ctx.fill();

        // Edge stroke (ultra-fine jewelry wireframe)
        const edgeAlpha = Math.max(0.2, Math.min(0.9, 0.4 + dispersionGlint * 0.6));
        ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha})`;
        ctx.lineWidth = (0.75 + dispersionGlint * 0.5) * dpr;
        ctx.stroke();

        // Gold facet highlight
        if (dispersionGlint > 0.2) {
          ctx.strokeStyle = `rgba(212, 175, 55, ${dispersionGlint * 0.8})`;
          ctx.lineWidth = 1.2 * dpr;
          ctx.stroke();
        }
      }

      // 5. Render Floating Diamond Dust Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.sparklePhase += p.sparkleSpeed;

        if (p.y < -400) p.y = 400;
        if (p.x < -400) p.x = 400;
        if (p.x > 400) p.x = -400;

        const fov = 750;
        const perspective = fov / (fov + p.z);
        const px = centerX + p.x * scale * dpr * perspective;
        const py = centerY + p.y * scale * dpr * perspective;

        const pulse = (Math.sin(p.sparklePhase) + 1) / 2;
        const currentOpacity = p.opacity * (0.4 + pulse * 0.6);

        ctx.beginPath();
        ctx.arc(px, py, p.size * scale * dpr * perspective, 0, Math.PI * 2);
        ctx.fillStyle =
          p.hue === 'gold'
            ? `rgba(244, 208, 63, ${currentOpacity})`
            : `rgba(240, 248, 255, ${currentOpacity})`;
        ctx.fill();

        // Subtle diamond particle glow
        if (pulse > 0.75) {
          ctx.beginPath();
          ctx.arc(px, py, p.size * 2.8 * scale * dpr, 0, Math.PI * 2);
          ctx.fillStyle =
            p.hue === 'gold'
              ? `rgba(212, 175, 55, ${currentOpacity * 0.3})`
              : `rgba(186, 230, 253, ${currentOpacity * 0.3})`;
          ctx.fill();
        }
      }

      // 6. Dynamic Prismatic Sparkles on Key Vertices (Optical Diamond Fire)
      const sweepCycle = (time * 0.0018) % (Math.PI * 2);
      glints.forEach((glint, idx) => {
        const pt = transformed[glint.vertexIndex];
        if (!pt || pt.z > 80) return; // only front-facing vertices sparkle

        const phase = sweepCycle + (idx * Math.PI) / 3;
        const flare = Math.pow(Math.max(0, Math.sin(phase)), 12);
        if (flare < 0.05) return;

        const flareSize = glint.size * flare * scale * dpr;
        const gradFlare = ctx.createRadialGradient(pt.px, pt.py, 0, pt.px, pt.py, flareSize);
        gradFlare.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradFlare.addColorStop(0.2, `hsla(${glint.hue}, 95%, 75%, ${0.8 * flare})`);
        gradFlare.addColorStop(0.6, `hsla(${(glint.hue + 40) % 360}, 90%, 65%, ${0.25 * flare})`);
        gradFlare.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradFlare;
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, flareSize, 0, Math.PI * 2);
        ctx.fill();

        // 4-point cross diffraction spikes (camera optical aperture star)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * flare})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.moveTo(pt.px - flareSize * 1.6, pt.py);
        ctx.lineTo(pt.px + flareSize * 1.6, pt.py);
        ctx.moveTo(pt.px, pt.py - flareSize * 1.6);
        ctx.lineTo(pt.px, pt.py + flareSize * 1.6);
        ctx.stroke();

        // Secondary diagonal flare
        ctx.strokeStyle = `hsla(${glint.hue}, 90%, 75%, ${0.45 * flare})`;
        ctx.lineWidth = 0.8 * dpr;
        ctx.beginPath();
        ctx.moveTo(pt.px - flareSize * 0.9, pt.py - flareSize * 0.9);
        ctx.lineTo(pt.px + flareSize * 0.9, pt.py + flareSize * 0.9);
        ctx.moveTo(pt.px + flareSize * 0.9, pt.py - flareSize * 0.9);
        ctx.lineTo(pt.px - flareSize * 0.9, pt.py + flareSize * 0.9);
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ filter: 'drop-shadow(0 0 25px rgba(212, 175, 55, 0.25))' }}
    />
  );
};
