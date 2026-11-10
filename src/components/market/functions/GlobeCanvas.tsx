"use client";

// WebGL globe for the GLOBE function. three.js draws the sphere, dotted land,
// coastlines, day/night shading and flow arcs; markers are DOM nodes projected
// onto it every frame so they stay crisp and clickable.
//
// The globe is fixed in world space (north = +Y, lon 0 faces +Z) and the camera
// orbits it, so a marker's position never changes — only its projection does.

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface GlobeMarker {
  id: string;
  lat: number;
  lon: number;
  tone: "up" | "down" | "flat" | "gold";
  shape?: "dot" | "diamond";
  /** Larger, pulsing, drawn above the rest. */
  emphasis?: boolean;
  /** Text pinned next to the marker. */
  label?: string;
  labelTone?: "up" | "down" | "flat" | "gold";
  /** Keep this label even when it collides with another. */
  emphasisLabel?: boolean;
}

export interface GlobeArc {
  id: string;
  a: [number, number];
  b: [number, number];
}

interface Props {
  markers: GlobeMarker[];
  arcs: GlobeArc[];
  /** Fly the camera here whenever `key` changes. */
  focus?: { lat: number; lon: number; key: string } | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  className?: string;
}

const D2R = Math.PI / 180;

const toVec = (lat: number, lon: number, r = 1) =>
  new THREE.Vector3(
    r * Math.cos(lat * D2R) * Math.sin(lon * D2R),
    r * Math.sin(lat * D2R),
    r * Math.cos(lat * D2R) * Math.cos(lon * D2R)
  );

/** Unit vector toward the sun (subsolar point) for the current UTC time. */
const sunDirection = (now: Date) => {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = (now.getTime() - start) / 86_400_000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  return toVec(decl, -(hours - 12) * 15).normalize();
};

const TONE_BG: Record<string, string> = {
  up: "bg-green-400",
  down: "bg-red-400",
  flat: "bg-gray-400",
  gold: "bg-yellow-300",
};
const TONE_TEXT: Record<string, string> = {
  up: "text-green-300",
  down: "text-red-300",
  flat: "text-gray-300",
  gold: "text-yellow-200",
};
const TONE_GLOW: Record<string, string> = {
  up: "0 0 10px rgba(74,222,128,0.9)",
  down: "0 0 10px rgba(248,113,113,0.9)",
  flat: "0 0 8px rgba(200,200,200,0.5)",
  gold: "0 0 10px rgba(250,204,21,0.9)",
};

const MIN_DIST = 1.7;
const MAX_DIST = 6;
const HOME_DIST = 3.8;

const GlobeCanvas: React.FC<Props> = ({ markers, arcs, focus, onPick, onHover, className }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerEls = useRef(new Map<string, HTMLButtonElement>());
  const markersRef = useRef<GlobeMarker[]>(markers);
  markersRef.current = markers;

  // Camera state lives in a ref: the render loop reads and eases it.
  const cam = useRef({ lat: 18, lon: 20, dist: HOME_DIST, tLat: 18, tLon: 20, tDist: HOME_DIST, auto: true });
  const arcGroup = useRef<THREE.Group | null>(null);
  const arcMat = useRef<THREE.ShaderMaterial | null>(null);
  const [auto, setAuto] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const setAutoBoth = (v: boolean) => {
    cam.current.auto = v;
    setAuto(v);
  };

  /* ------------------------------ scene ------------------------------ */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T) => {
      disposables.push(o);
      return o;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cam.current.auto = false;
      setAuto(false);
    }

    const sun = sunDirection(new Date());

    // Ocean sphere — also writes depth so the far side of the globe is hidden.
    const oceanMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: sun } },
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uSun; varying vec3 vN;
          void main(){
            float day = smoothstep(-0.2, 0.3, dot(vN, uSun));
            vec3 night = vec3(0.035, 0.032, 0.024);
            vec3 lit = vec3(0.085, 0.074, 0.048);
            gl_FragColor = vec4(mix(night, lit, day), 1.0);
          }`,
      })
    );
    scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(0.996, 96, 64)), oceanMat));

    // Atmosphere rim.
    const atmoMat = track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(0.98, 0.80, 0.08, 1.0) * i * 0.9; }`,
      })
    );
    scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(1.16, 64, 48)), atmoMat));

    // Graticule every 30°.
    {
      const pts: number[] = [];
      const push = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      for (let lon = -180; lon < 180; lon += 30) {
        for (let lat = -80; lat < 80; lat += 4) push(toVec(lat, lon, 1.001), toVec(lat + 4, lon, 1.001));
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        for (let lon = -180; lon < 180; lon += 4) push(toVec(lat, lon, 1.001), toVec(lat, lon + 4, 1.001));
      }
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      scene.add(new THREE.LineSegments(g, track(new THREE.LineBasicMaterial({ color: 0xf2ede3, transparent: true, opacity: 0.055 }))));
    }

    // Flow arcs: a soft base line with a bright pulse travelling a → b.
    const group = new THREE.Group();
    scene.add(group);
    arcGroup.current = group;
    arcMat.current = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime; varying float vT;
          void main(){
            float head = pow(1.0 - fract(vT - uTime * 0.22), 7.0);
            float ends = smoothstep(0.0, 0.06, vT) * smoothstep(1.0, 0.94, vT);
            gl_FragColor = vec4(mix(vec3(0.98,0.80,0.08), vec3(1.0,0.95,0.7), head), (0.28 + head * 0.72) * ends);
          }`,
      })
    );

    // Land dots + coastlines + borders, from the pre-built geometry file.
    let alive = true;
    const dotMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uSun: { value: sun }, uScale: { value: 1 } },
        vertexShader: `uniform vec3 uSun; uniform float uScale; varying float vDay;
          void main(){
            vDay = smoothstep(-0.18, 0.28, dot(normalize(position), uSun));
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uScale / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `varying float vDay;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            vec3 night = vec3(0.42, 0.33, 0.10);
            vec3 lit = vec3(0.99, 0.86, 0.42);
            gl_FragColor = vec4(mix(night, lit, vDay), (0.55 + 0.4 * vDay) * smoothstep(0.5, 0.3, d));
          }`,
      })
    );
    fetch("/terminal/globe-110m.json")
      .then((r) => r.json())
      .then((geo: { coast: number[][]; borders: number[][]; dots: number[] }) => {
        if (!alive) return;
        const dots = new Float32Array((geo.dots.length / 2) * 3);
        for (let i = 0, j = 0; i < geo.dots.length; i += 2, j += 3) {
          const v = toVec(geo.dots[i + 1] / 10, geo.dots[i] / 10, 1.002);
          dots[j] = v.x; dots[j + 1] = v.y; dots[j + 2] = v.z;
        }
        const dg = track(new THREE.BufferGeometry());
        dg.setAttribute("position", new THREE.BufferAttribute(dots, 3));
        scene.add(new THREE.Points(dg, dotMat));

        const lines = (polys: number[][], color: number, opacity: number) => {
          const pts: number[] = [];
          for (const p of polys) {
            for (let i = 0; i + 3 < p.length; i += 2) {
              const a = toVec(p[i + 1] / 100, p[i] / 100, 1.003);
              const b = toVec(p[i + 3] / 100, p[i + 2] / 100, 1.003);
              pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
            }
          }
          const g = track(new THREE.BufferGeometry());
          g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
          scene.add(new THREE.LineSegments(g, track(new THREE.LineBasicMaterial({ color, transparent: true, opacity }))));
        };
        lines(geo.coast, 0xfacc15, 0.5);
        lines(geo.borders, 0xfde68a, 0.13);
        setReady(true);
      })
      .catch(() => alive && setReady(true));

    /* ---- sizing ---- */
    let w = 0;
    let h = 0;
    const resize = () => {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    /* ---- pointer: drag to rotate, pinch to zoom ---- */
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    let moved = 0;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-globe-ui]")) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const c = cam.current;
      if (pointers.size === 1) {
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 4) {
          if (c.auto) {
            c.auto = false;
            setAuto(false);
          }
          const k = (0.22 * c.dist) / 3;
          c.tLon -= dx * k;
          c.tLat = Math.max(-80, Math.min(80, c.tLat + dy * k));
          wrap.style.cursor = "grabbing";
        }
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) c.tDist = Math.max(MIN_DIST, Math.min(MAX_DIST, c.tDist * (pinch / d)));
        pinch = d;
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = 0;
      wrap.style.cursor = "grab";
    };
    // Trackpad pinch arrives as ctrl+wheel; a plain wheel keeps scrolling the page.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const c = cam.current;
      c.tDist = Math.max(MIN_DIST, Math.min(MAX_DIST, c.tDist * Math.exp(e.deltaY * 0.01)));
    };
    wrap.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });

    /* ---- loop ---- */
    const v = new THREE.Vector3();
    const placed: [number, number, number, number][] = [];
    let raf = 0;
    let last = performance.now();
    let sunAt = Date.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!w || !h || wrap.offsetParent === null) return; // hidden panel

      const c = cam.current;
      if (c.auto && pointers.size === 0) c.tLon += dt * 4;
      const ease = 1 - Math.exp(-dt * 6);
      c.lat += (c.tLat - c.lat) * ease;
      c.lon += (c.tLon - c.lon) * ease;
      c.dist += (c.tDist - c.dist) * ease;

      // Pull back on portrait screens so the whole globe stays in frame.
      const fit = Math.max(1, 1.14 / camera.aspect);
      camera.position.copy(toVec(c.lat, c.lon, c.dist * fit));
      camera.lookAt(0, 0, 0);
      dotMat.uniforms.uScale.value = h * dpr * 0.015;
      if (arcMat.current) arcMat.current.uniforms.uTime.value = now / 1000;
      if (Date.now() - sunAt > 60_000) {
        sunAt = Date.now();
        sun.copy(sunDirection(new Date()));
      }
      renderer.render(scene, camera);

      // Project markers. A point on the unit sphere is on the near side when
      // p · camera > 1.
      placed.length = 0;
      for (const m of markersRef.current) {
        const el = markerEls.current.get(m.id);
        if (!el) continue;
        v.copy(toVec(m.lat, m.lon, 1.004));
        const facing = v.dot(camera.position);
        if (facing <= 1.0) {
          if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
          continue;
        }
        v.project(camera);
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-v.y * 0.5 + 0.5) * h;
        el.style.visibility = "visible";
        el.style.opacity = String(Math.min(1, (facing - 1) / 0.18));
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;

        // Greedy label declutter: a label that would overlap one already
        // placed this frame is hidden (the marker stays, hover still reads it).
        if (m.label) {
          const lab = el.lastElementChild as HTMLElement | null;
          if (lab && lab.dataset.label !== undefined) {
            const x0 = x + 8;
            const x1 = x0 + m.label.length * 6.3 + 8;
            const y0 = y - 9;
            const y1 = y + 9;
            const hit = placed.some((r) => x0 < r[1] && x1 > r[0] && y0 < r[3] && y1 > r[2]);
            if (!hit) placed.push([x0, x1, y0, y1]);
            const show = hit && !m.emphasisLabel ? "0" : "1";
            if (lab.style.opacity !== show) lab.style.opacity = show;
          }
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("wheel", onWheel);
      group.children.forEach((l) => (l as THREE.Line).geometry.dispose());
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      arcGroup.current = null;
      arcMat.current = null;
    };
  }, []);

  /* ------------------------------ arcs ------------------------------ */
  const arcKey = arcs.map((a) => a.id).join("|");
  useEffect(() => {
    const group = arcGroup.current;
    const mat = arcMat.current;
    if (!group || !mat) return;
    group.children.forEach((l) => (l as THREE.Line).geometry.dispose());
    group.clear();
    for (const arc of arcs) {
      const a = toVec(arc.a[0], arc.a[1]);
      const b = toVec(arc.b[0], arc.b[1]);
      const angle = a.angleTo(b);
      const lift = 0.06 + 0.32 * (angle / Math.PI);
      const N = 72;
      const pos = new Float32Array((N + 1) * 3);
      const ts = new Float32Array(N + 1);
      const sin = Math.sin(angle) || 1;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        // Spherical interpolation, lifted off the surface mid-flight.
        const p = a.clone().multiplyScalar(Math.sin((1 - t) * angle) / sin).add(b.clone().multiplyScalar(Math.sin(t * angle) / sin));
        p.normalize().multiplyScalar(1.006 + lift * Math.sin(Math.PI * t));
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        ts[i] = t;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aT", new THREE.BufferAttribute(ts, 1));
      group.add(new THREE.Line(g, mat));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcKey]);

  /* ------------------------------ focus ------------------------------ */
  const focusKey = focus?.key;
  useEffect(() => {
    if (!focus) return;
    const c = cam.current;
    // Take the short way round.
    const delta = ((((focus.lon - c.tLon) % 360) + 540) % 360) - 180;
    c.tLon += delta;
    c.tLat = Math.max(-70, Math.min(70, focus.lat));
    setAutoBoth(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const zoom = (f: number) => {
    const c = cam.current;
    c.tDist = Math.max(MIN_DIST, Math.min(MAX_DIST, c.tDist * f));
  };

  const ctl =
    "w-8 h-8 grid place-items-center rounded-lg border border-white/10 bg-night/80 backdrop-blur text-gray-300 hover:text-yellow-300 hover:border-yellow-400/40 font-mono text-sm transition-colors";

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden select-none touch-none ${className ?? ""}`}
      style={{ cursor: "grab" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {failed && (
        <p className="absolute inset-0 grid place-items-center text-sm text-gray-500 px-6 text-center">
          This browser could not start WebGL, so the globe cannot be drawn. The quotes alongside still update.
        </p>
      )}
      {!ready && !failed && (
        <p className="absolute inset-0 grid place-items-center text-[11px] font-mono uppercase tracking-widest text-gray-600">Loading globe…</p>
      )}

      {/* Markers — positioned by the render loop */}
      {markers.map((m) => {
        const size = m.emphasis ? 11 : 7;
        return (
          <button
            key={m.id}
            data-globe-ui
            ref={(el) => {
              if (el) markerEls.current.set(m.id, el);
              else markerEls.current.delete(m.id);
            }}
            onClick={() => onPick(m.id)}
            onMouseEnter={() => onHover(m.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(m.id)}
            onBlur={() => onHover(null)}
            aria-label={m.label || m.id}
            className="absolute left-0 top-0 w-0 h-0 group outline-none"
            style={{ visibility: "hidden", zIndex: m.emphasis ? 3 : 2, willChange: "transform" }}
          >
            {/* 24px hit area centred on the point */}
            <span className="absolute -left-3 -top-3 w-6 h-6 grid place-items-center">
              {m.emphasis && (
                <span className={`absolute rounded-full ${TONE_BG[m.tone]} opacity-40 animate-ping`} style={{ width: size + 6, height: size + 6 }} />
              )}
              <span
                className={`relative block ${TONE_BG[m.tone]} ${m.shape === "diamond" ? "rotate-45 rounded-[2px]" : "rounded-full"} ring-1 ring-black/60 transition-transform group-hover:scale-150 group-focus-visible:scale-150`}
                style={{ width: size, height: size, boxShadow: TONE_GLOW[m.tone] }}
              />
            </span>
            {m.label && (
              <span
                data-label
                className={`absolute left-2.5 -top-2 transition-opacity whitespace-nowrap font-mono text-[10px] font-bold leading-4 px-1 rounded bg-night/75 ${TONE_TEXT[m.labelTone ?? "flat"]}`}
              >
                {m.label}
              </span>
            )}
          </button>
        );
      })}

      {/* Controls */}
      <div data-globe-ui className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button className={ctl} onClick={() => zoom(0.8)} aria-label="Zoom in">+</button>
        <button className={ctl} onClick={() => zoom(1.25)} aria-label="Zoom out">−</button>
        <button
          className={`${ctl} ${auto ? "!text-yellow-300 !border-yellow-400/40" : ""}`}
          onClick={() => setAutoBoth(!auto)}
          aria-label={auto ? "Stop rotation" : "Rotate globe"}
          title={auto ? "Stop rotation" : "Rotate globe"}
        >
          {auto ? "❚❚" : "⟳"}
        </button>
      </div>
    </div>
  );
};

export default GlobeCanvas;
