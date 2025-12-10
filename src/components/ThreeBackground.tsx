"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 35);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // transparent background
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xfacc15, 0.3);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfcd34d, 1.5);
    dirLight.position.set(10, 30, 20);
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xfcd34d, 0x000000, 0.5);
    scene.add(hemiLight);

    // City grid setup
    const cityGroup = new THREE.Group();
    const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);

    for (let x = -25; x <= 25; x += 2.5) {
      for (let z = -25; z <= 25; z += 2.5) {
        const height = Math.random() * 15 + 2;

        const material = new THREE.MeshStandardMaterial({
          color: 0x111111,
          emissive: 0xfacc15,
          emissiveIntensity: 0.3 + Math.random() * 0.3,
          roughness: 0.6,
          metalness: 1,
        });

        const building = new THREE.Mesh(buildingGeometry, material);
        building.scale.set(1.5, height, 1.5);
        building.position.set(x, height / 2 - 5, z);
        cityGroup.add(building);
      }
    }

    scene.add(cityGroup);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.8,
        metalness: 0.2,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    scene.add(ground);

    // Streetlights (small glowing points)
    const lightsGeometry = new THREE.BufferGeometry();
    const lightPositions = [];
    for (let i = 0; i < 100; i++) {
      lightPositions.push(
        (Math.random() - 0.5) * 80,
        Math.random() * 2 - 4,
        (Math.random() - 0.5) * 80
      );
    }
    lightsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(lightPositions, 3)
    );

    const lightsMaterial = new THREE.PointsMaterial({
      color: 0xfcd34d,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
    });

    const streetLights = new THREE.Points(lightsGeometry, lightsMaterial);
    scene.add(streetLights);

    // Depth fog for realism
    scene.fog = new THREE.FogExp2(0x000000, 0.035);

    // Mouse movement for parallax
    const mouse = { x: 0, y: 0 };
    window.addEventListener("mousemove", (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();

      // Flickering gold windows
      cityGroup.children.forEach((b, i) => {
        const mat = (b as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.3 + Math.sin(t * 2 + i) * 0.2;
      });

      // Gentle camera parallax
      camera.position.x += (mouse.x * 5 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 2 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Resize handling
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-0 overflow-hidden"
      style={{ background: "transparent" }}
    />
  );
}
