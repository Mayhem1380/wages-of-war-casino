import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SYMBOL_META, fmt } from "@/data/gameMeta";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sfx } from "@/lib/sounds";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import { ArrowLeft, Minus, Plus } from "@phosphor-icons/react";

const MIN_BET = 20;
const MAX_BET = 100000;
const NUM_REELS = 5;
const SYMBOLS_PER_REEL = 16;
const REEL_RADIUS = 3.5;
const ROW_Y = [0.9, 0, -0.9];

// Decorative carousel geometries — spin-loop filler, not tied to real symbols.
const DECORATIVE_GEOMETRIES = [
  new THREE.TorusKnotGeometry(0.35, 0.12, 64, 16),
  new THREE.DodecahedronGeometry(0.4),
  new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32),
  new THREE.SphereGeometry(0.4, 16, 16),
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
];

function drawSymbolTexture(symbolId) {
  const meta = SYMBOL_META[symbolId] || { color: "#F6E27A" };
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#120a02";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = meta.color;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 116);
  ctx.fillStyle = meta.color;
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(meta.text || symbolId.slice(0, 2).toUpperCase(), 64, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function Carnival3DSlot() {
  const params = useParams();
  const id = params.id || "golden_dragon";
  const navigate = useNavigate();
  const { user, refreshUser, openAuth } = useAuth();
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [machine, setMachine] = useState(null);
  const [bet, setBet] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [bigWin, setBigWin] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get(`/games/slots/${id}`)
      .then(({ data }) => alive && setMachine(data))
      .catch(() => navigate("/lobby"));
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  // Three.js scene setup — runs once, tears itself down on unmount.
  useEffect(() => {
    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05020a, 0.03);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const goldSpotLight = new THREE.SpotLight(0xffd700, 3);
    goldSpotLight.position.set(0, 10, 8);
    goldSpotLight.angle = Math.PI / 4;
    goldSpotLight.penumbra = 0.8;
    scene.add(goldSpotLight);
    const rimLight = new THREE.DirectionalLight(0xff4500, 2);
    rimLight.position.set(-5, -5, -2);
    scene.add(rimLight);

    const goldPBRMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x331100,
    });

    const reelGroups = [];
    const faceGroups = [];
    for (let r = 0; r < NUM_REELS; r++) {
      const reelGroup = new THREE.Group();
      reelGroup.position.x = (r - 2) * 1.6;
      for (let s = 0; s < SYMBOLS_PER_REEL; s++) {
        const angle = (s / SYMBOLS_PER_REEL) * Math.PI * 2;
        const geo = DECORATIVE_GEOMETRIES[s % DECORATIVE_GEOMETRIES.length];
        const mesh = new THREE.Mesh(geo, goldPBRMaterial);
        mesh.position.y = Math.sin(angle) * REEL_RADIUS;
        mesh.position.z = Math.cos(angle) * REEL_RADIUS;
        mesh.rotation.x = -angle;
        reelGroup.add(mesh);
      }
      scene.add(reelGroup);
      reelGroups.push(reelGroup);

      const faceGroup = new THREE.Group();
      faceGroup.position.x = reelGroup.position.x;
      faceGroup.position.z = REEL_RADIUS - 0.05;
      faceGroup.visible = false;
      ROW_Y.forEach((y) => {
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(1.2, 1.2),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
        );
        plane.position.y = y;
        faceGroup.add(plane);
      });
      scene.add(faceGroup);
      faceGroups.push(faceGroup);
    }

    const particleCount = 800;
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel = [];
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = 0;
      particlePos[i * 3 + 1] = -2;
      particlePos[i * 3 + 2] = 2;
      particleVel.push({
        x: (Math.random() - 0.5) * 0.3,
        y: Math.random() * 0.4 + 0.2,
        z: (Math.random() - 0.5) * 0.3,
      });
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.15,
      transparent: true,
      opacity: 0,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    function updateParticles() {
      if (particleMat.opacity <= 0) return;
      const positions = particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleVel[i].x;
        positions[i * 3 + 1] += particleVel[i].y;
        positions[i * 3 + 2] += particleVel[i].z;
        particleVel[i].y -= 0.01;
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
      particleMat.opacity -= 0.005;
    }

    let frameId;
    function animate(time) {
      frameId = requestAnimationFrame(animate);
      TWEEN.update(time);
      if (!sceneRef.current?.spinning) {
        reelGroups.forEach((reel, i) => {
          reel.position.y = Math.sin(time * 0.002 + i) * 0.05;
        });
      }
      updateParticles();
      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", handleResize);

    sceneRef.current = {
      reelGroups,
      faceGroups,
      particleMat,
      particleSystem,
      spinning: false,
    };

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      reelGroups.forEach((g) =>
        g.children.forEach((mesh) => mesh.material?.dispose?.()),
      );
      faceGroups.forEach((g) =>
        g.children.forEach((mesh) => {
          mesh.material?.map?.dispose?.();
          mesh.material?.dispose?.();
          mesh.geometry?.dispose?.();
        }),
      );
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  const revealGrid = useCallback((grid, onDone) => {
    const s = sceneRef.current;
    if (!s) return;
    s.reelGroups.forEach((reel, reelIdx) => {
      const spinAmount = Math.PI * 6 + reelIdx * Math.PI * 0.4;
      new TWEEN.Tween(reel.rotation)
        .to({ x: reel.rotation.x + spinAmount }, 1100 + reelIdx * 220)
        .easing(TWEEN.Easing.Back.Out)
        .onComplete(() => {
          reel.visible = false;
          const faceGroup = s.faceGroups[reelIdx];
          faceGroup.children.forEach((plane, row) => {
            const symbolId = grid[reelIdx][row];
            const texture = drawSymbolTexture(symbolId);
            plane.material.map?.dispose();
            plane.material.map = texture;
            plane.material.opacity = 1;
            plane.material.needsUpdate = true;
          });
          faceGroup.visible = true;
          if (reelIdx === NUM_REELS - 1) onDone();
        })
        .start();
    });
  }, []);

  const resetReels = () => {
    const s = sceneRef.current;
    if (!s) return;
    s.reelGroups.forEach((reel) => {
      reel.visible = true;
    });
    s.faceGroups.forEach((g) => {
      g.visible = false;
    });
  };

  const triggerParticles = () => {
    const s = sceneRef.current;
    if (!s) return;
    s.particleMat.opacity = 1;
    const positions = s.particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -1;
      positions[i * 3 + 2] = 2;
    }
    s.particleSystem.geometry.attributes.position.needsUpdate = true;
  };

  const doSpin = async () => {
    if (!user) {
      openAuth("register");
      return;
    }
    if (spinning || !machine) return;
    if (user.balance < bet) {
      toast.error("Insufficient credits — resupply at the wallet.");
      return;
    }
    sfx.prime();
    setSpinning(true);
    setLastWin(0);
    if (sceneRef.current) sceneRef.current.spinning = true;
    resetReels();
    sfx.spin();
    try {
      const { data } = await api.post("/games/slots/spin", {
        machine_id: id,
        bet,
      });
      revealGrid(data.grid, () => {
        setSpinning(false);
        if (sceneRef.current) sceneRef.current.spinning = false;
        setLastWin(data.total_win);
        refreshUser();
        if (data.total_win > 0) {
          sfx.win();
          triggerParticles();
          toast.success(`WIN +${fmt(data.total_win)} credits`);
        }
        if (data.total_win >= bet * 50) {
          sfx.bigWin();
          setBigWin({ win: data.total_win, multiplier: 1 });
        }
      });
    } catch (e) {
      setSpinning(false);
      if (sceneRef.current) sceneRef.current.spinning = false;
      resetReels();
      toast.error(e.response?.data?.detail || "Spin failed");
    }
  };

  const changeBet = (delta) =>
    setBet((b) => Math.max(MIN_BET, Math.min(MAX_BET, b + delta)));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-2 sm:pt-4 pb-28 lg:pb-8">
      {bigWin && (
        <BigWinOverlay
          win={bigWin.win}
          multiplier={bigWin.multiplier}
          onDone={() => setBigWin(null)}
        />
      )}
      <button
        onClick={() => navigate(`/slots/${id}`)}
        className="flex items-center gap-2 text-muted-foreground hover:text-nvg font-mono text-sm mb-2 sm:mb-6"
      >
        <ArrowLeft size={16} /> RETURN TO 2D VIEW
      </button>

      <h1 className="font-display text-3xl sm:text-5xl tracking-wide gold-gradient mb-4">
        {machine?.name || "Spring Carnival"} — 3D
      </h1>

      <div
        ref={mountRef}
        style={{ width: "100%", height: "60vh", background: "#05020a" }}
        className="rounded-xl overflow-hidden"
      />

      <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
        <div className="flex items-center gap-2 font-mono">
          <Button variant="outline" size="icon" onClick={() => changeBet(-20)}>
            <Minus size={16} />
          </Button>
          <span className="text-lg text-gold min-w-24 text-center">{fmt(bet)}</span>
          <Button variant="outline" size="icon" onClick={() => changeBet(20)}>
            <Plus size={16} />
          </Button>
        </div>
        <Button
          className="spin-btn"
          disabled={spinning || !machine}
          onClick={doSpin}
        >
          {spinning ? "SPINNING..." : "SPIN"}
        </Button>
        <div className="font-mono text-gold text-lg">
          {lastWin > 0 ? `WIN: ${fmt(lastWin)}` : ""}
        </div>
      </div>
    </div>
  );
}
