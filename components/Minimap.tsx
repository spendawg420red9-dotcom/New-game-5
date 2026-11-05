import React, { useRef, useEffect } from 'react';
import { PlayerScore, ZombieData, MapConfig } from '../types';
import * as THREE from 'three';
import { createPortal } from 'react-dom';

interface MinimapProps {
  playerPos: React.MutableRefObject<THREE.Vector3>;
  playerRot: React.MutableRefObject<THREE.Euler>;
  zombieRefs: React.MutableRefObject<ZombieData[]>;
  otherPlayers: PlayerScore[];
  gravePos: THREE.Vector3 | null;
  mapConfig: MapConfig;
  visible: boolean;
  position: { x: number; y: number };
  scale?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  playerRot,
  zombieRefs,
  otherPlayers,
  gravePos,
  mapConfig,
  visible,
  position,
  scale = 1
}) => {
  const [root, setRoot] = React.useState<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const findRoot = () => {
      const el = document.getElementById('minimap-root');
      if (el) {
        setRoot(el);
      } else {
        // Retry in a bit if not found
        setTimeout(findRoot, 100);
      }
    };
    findRoot();
  }, []);

  useEffect(() => {
    if (!visible || !root) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 150 * (scale || 1); // Minimap size
    if (isNaN(size) || size <= 0) return;
    
    canvas.width = size;
    canvas.height = size;
    
    // Map bounds (approximate based on typical map size)
    // We'll use a fixed zoom level for now: 1 unit in world = 2 pixels on map
    const zoom = 3 * scale; 

    const render = () => {
      if (!canvasRef.current || !visible) return;
      requestRef.current = requestAnimationFrame(render);
      
      if (!playerPos.current || !playerRot.current || !zombieRefs.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Center of minimap is player position
      const centerX = size / 2;
      const centerY = size / 2;
      
      if (isNaN(centerX) || isNaN(centerY)) return;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, size, size);

      // Draw Map Objects (Simple representation)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      mapConfig.objects?.forEach(obj => {
        if (!obj || !obj.pos) return;
        if (obj.type === 'box' || obj.type === 'building') {
            const width = (obj.args?.[0] || 1) * zoom;
            const depth = (obj.args?.[2] || 1) * zoom;
            
            // Relative position to player
            const relX = (obj.pos[0] - playerPos.current!.x) * zoom;
            const relZ = (obj.pos[2] - playerPos.current!.z) * zoom;

            // Draw rect
            ctx.fillRect(centerX + relX - width/2, centerY + relZ - depth/2, width, depth);
        }
      });

      // Draw Perks and Gun Box from interactables
      mapConfig.interactables?.forEach(interactable => {
        if (!interactable || !interactable.pos) return;
        const relX = (interactable.pos[0] - playerPos.current!.x) * zoom;
        const relZ = (interactable.pos[2] - playerPos.current!.z) * zoom;
        
        if (Math.abs(relX) < size/2 && Math.abs(relZ) < size/2) {
            if (interactable.type.startsWith('PERK:')) {
                ctx.fillStyle = interactable.color || '#eab308'; // yellow default
                ctx.beginPath();
                ctx.arc(centerX + relX, centerY + relZ, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (interactable.type === 'Gun Box') {
                ctx.fillStyle = '#3b82f6'; // blue
                ctx.fillRect(centerX + relX - 3, centerY + relZ - 3, 6, 6);
            }
        }
      });

      // Draw Zombies
      zombieRefs.current?.forEach(z => {
        if (!z || z.hp <= 0 || !z.position) return;
        
        // Handle both array and Vector3 positions
        const zX = Array.isArray(z.position) ? z.position[0] : (z.position as any).x;
        const zZ = Array.isArray(z.position) ? z.position[2] : (z.position as any).z;
        
        if (zX === undefined || zZ === undefined) return;
        
        const relX = (zX - playerPos.current!.x) * zoom;
        const relZ = (zZ - playerPos.current!.z) * zoom;

        // Check if within bounds
        if (Math.abs(relX) < size/2 && Math.abs(relZ) < size/2) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(centerX + relX, centerY + relZ, 3, 0, Math.PI * 2);
            ctx.fill();
        }
      });

      // Draw Grave Stone
      if (gravePos) {
        const relX = (gravePos.x - playerPos.current!.x) * zoom;
        const relZ = (gravePos.z - playerPos.current!.z) * zoom;
        if (Math.abs(relX) < size/2 && Math.abs(relZ) < size/2) {
            ctx.fillStyle = '#ffffff'; // White for grave
            ctx.fillRect(centerX + relX - 3, centerY + relZ - 3, 6, 6);
        }
      }

      // Draw Other Players / Bots
      otherPlayers?.forEach(p => {
        if (!p || !p.position || (p.hp <= 0 && !p.isDowned)) return;
        const relX = (p.position.x - playerPos.current!.x) * zoom;
        const relZ = (p.position.z - playerPos.current!.z) * zoom;

        if (Math.abs(relX) < size/2 && Math.abs(relZ) < size/2) {
            ctx.fillStyle = p.isBot ? '#00ffff' : '#0000ff'; // Cyan for bots, Blue for players
            ctx.beginPath();
            ctx.arc(centerX + relX, centerY + relZ, 4, 0, Math.PI * 2);
            ctx.fill();
        }
      });

      // Draw Player (Center)
      ctx.save();
      ctx.translate(centerX, centerY);
      // Rotate arrow to match player rotation
      // In 3D, rotation.y is rotation around vertical axis.
      // Canvas Y is down, 3D Z is forward/back.
      // We need to map 3D rotation to 2D canvas rotation.
      // If player rot Y is 0, they face -Z (North).
      // On canvas, -Y is Up.
      // So rotation should be playerRot.y + Math.PI (to flip it? or just playerRot.y?)
      // Let's try playerRot.y
      ctx.rotate(-playerRot.current!.y); 
      
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 4);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    render();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [visible, scale, mapConfig, root]); // Added root to dependencies

  if (!visible || !root) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      className="absolute rounded-full border-2 border-white/20 shadow-lg bg-black/40 backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    />,
    root
  );
};
