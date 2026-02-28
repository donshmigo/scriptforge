"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200
    );
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const pages: {
      group: THREE.Group;
      rotDelta: { x: number; y: number; z: number };
      floatAmp: number;
      floatFreq: number;
      floatPhase: number;
      baseZ: number;
      driftSpeed: number;
    }[] = [];

    const PAGE_W = 1.05;
    const PAGE_H = 1.4;
    const PAGE_COUNT = 22;

    for (let i = 0; i < PAGE_COUNT; i++) {
      const group = new THREE.Group();

      // ── Page surface ──────────────────────────────────────────────────
      const planeGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x0e0e18,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      });
      group.add(new THREE.Mesh(planeGeo, planeMat));

      // ── Page border glow ──────────────────────────────────────────────
      const edgeGeo = new THREE.EdgesGeometry(planeGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x7c5cfc,
        transparent: true,
        opacity: 0.18 + Math.random() * 0.32,
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.z = 0.005;
      group.add(edges);

      // ── Text lines ────────────────────────────────────────────────────
      const lineCount = 5 + Math.floor(Math.random() * 6);
      const pts: number[] = [];
      for (let l = 0; l < lineCount; l++) {
        const y = PAGE_H / 2 - 0.14 - l * (PAGE_H - 0.28) / (lineCount - 1);
        const w = 0.28 + Math.random() * 0.5;
        const x = -PAGE_W / 2 + 0.12 + Math.random() * (PAGE_W - 0.24 - w);
        pts.push(x, y, 0.01, x + w, y, 0.01);
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(pts), 3)
      );
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x5b3fc5,
        transparent: true,
        opacity: 0.35,
      });
      group.add(new THREE.LineSegments(lineGeo, lineMat));

      // ── Top accent line (like a script header) ────────────────────────
      const headerPts = new Float32Array([
        -PAGE_W / 2 + 0.1, PAGE_H / 2 - 0.06, 0.01,
         PAGE_W / 2 - 0.4, PAGE_H / 2 - 0.06, 0.01,
      ]);
      const headerGeo = new THREE.BufferGeometry();
      headerGeo.setAttribute("position", new THREE.BufferAttribute(headerPts, 3));
      const headerMat = new THREE.LineBasicMaterial({
        color: 0x9d78ff,
        transparent: true,
        opacity: 0.55,
      });
      group.add(new THREE.LineSegments(headerGeo, headerMat));

      // ── Position ──────────────────────────────────────────────────────
      const baseZ = -4 - Math.random() * 14;
      group.position.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 12,
        baseZ
      );
      group.rotation.set(
        (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 0.5
      );

      scene.add(group);
      pages.push({
        group,
        rotDelta: {
          x: (Math.random() - 0.5) * 0.0028,
          y: (Math.random() - 0.5) * 0.0035,
          z: (Math.random() - 0.5) * 0.0018,
        },
        floatAmp: 0.06 + Math.random() * 0.1,
        floatFreq: 0.25 + Math.random() * 0.35,
        floatPhase: Math.random() * Math.PI * 2,
        baseZ,
        driftSpeed: 0.006 + Math.random() * 0.009,
      });
    }

    // ── Ambient particles ─────────────────────────────────────────────────
    const pCount = 800;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 28;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.022,
      color: new THREE.Color("#4c35a0"),
      transparent: true,
      opacity: 0.55,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Mouse parallax ────────────────────────────────────────────────────
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMouse = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2.5;
      ty = -(e.clientY / window.innerHeight - 0.5) * 1.6;
    };
    window.addEventListener("mousemove", onMouse);

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animation ─────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf: number;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      cx += (tx - cx) * 0.035;
      cy += (ty - cy) * 0.035;

      pages.forEach((p) => {
        p.group.rotation.x += p.rotDelta.x;
        p.group.rotation.y += p.rotDelta.y;
        p.group.rotation.z += p.rotDelta.z;

        // Float
        p.group.position.y +=
          Math.sin(t * p.floatFreq + p.floatPhase) * p.floatAmp * 0.012;

        // Drift toward camera
        p.group.position.z += p.driftSpeed;
        if (p.group.position.z > 6) {
          p.group.position.z = p.baseZ - 6;
          p.group.position.x = (Math.random() - 0.5) * 18;
          p.group.position.y = (Math.random() - 0.5) * 12;
        }
      });

      camera.position.x += (cx * 0.6 - camera.position.x) * 0.02;
      camera.position.y += (cy * 0.35 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}
