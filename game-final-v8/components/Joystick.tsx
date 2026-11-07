
import React, { useState, useRef } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onSprint?: (active: boolean) => void;
  label?: string;
  scale?: number;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, onSprint, label, scale = 1 }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [touchId, setTouchId] = useState<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  
  // Double flick detection refs
  const lastFlickTime = useRef(0);
  const inFlickZone = useRef(false);
  const isSprinting = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    // e.stopPropagation(); // Removed to allow multi-touch
    // Prevent default to stop scrolling/zooming but allow multi-touch
    // e.preventDefault(); 
    
    // Find the touch that started on this element
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // We only care about the first touch that lands on the joystick area if we aren't already tracking one
        if (touchId === null) {
            setTouchId(touch.identifier);
            setIsActive(true);
            updatePosition(touch);
            break; 
        }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // e.stopPropagation(); // Removed to allow multi-touch
    if (touchId === null) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        updatePosition(e.changedTouches[i]);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (touchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
              endTouch();
              break;
          }
      }
  };

  const updatePosition = (touch: React.Touch | { clientX: number; clientY: number }) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = (touch.clientX - centerX) / scale;
    const dy = (touch.clientY - centerY) / scale;
    const maxDist = 50; // Radius of the joystick base
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * distance;
    const ny = Math.sin(angle) * distance;
    
    // Normalize output -1 to 1
    const xVal = nx / maxDist;
    const yVal = -ny / maxDist; // Up is positive in game logic usually

    // Double flick detection logic (simplified for reliability)
    const SPRINT_THRESHOLD = 0.8;
    const magnitude = Math.sqrt(xVal * xVal + yVal * yVal);

    if (magnitude > SPRINT_THRESHOLD) {
        if (!isSprinting.current) {
             isSprinting.current = true;
             if (onSprint) onSprint(true);
        }
    } else {
        if (isSprinting.current) {
            isSprinting.current = false;
            if (onSprint) onSprint(false);
        }
    }

    setPosition({ x: nx, y: ny });
    onMove(xVal, yVal);
  };

  const endTouch = () => {
    setIsActive(false);
    setTouchId(null);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
    
    // Reset sprint on release
    if (isSprinting.current) {
      isSprinting.current = false;
      if (onSprint) onSprint(false);
    }
    inFlickZone.current = false;
  };

  return (
    <div className="flex flex-col items-center gap-2" style={{ transform: `scale(${scale})` }}>
      <div
        ref={baseRef}
        className={`joystick-base relative w-32 h-32 rounded-full border-4 backdrop-blur-md touch-none shadow-2xl transition-all duration-200 ${
          isSprinting.current ? 'bg-orange-600/20 border-orange-500/50 scale-105' : 'bg-white/5 border-white/10'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={(e) => {
          setIsActive(true);
          // For mouse, we don't need touchId logic, just track active state
          const rect = baseRef.current?.getBoundingClientRect();
          if(rect) {
             updatePosition({ clientX: e.clientX, clientY: e.clientY });
          }
        }}
        onMouseMove={(e) => {
          if (isActive) {
            updatePosition({ clientX: e.clientX, clientY: e.clientY });
          }
        }}
        onMouseUp={endTouch}
        onMouseLeave={endTouch}
      >
        <div
          className={`absolute w-12 h-12 rounded-full border-2 shadow-inner pointer-events-none transition-transform ${
            isSprinting.current ? 'bg-orange-500/40 border-orange-200' : 'bg-white/20 border-white/40'
          }`}
          style={{
            left: `calc(50% + ${position.x}px - 1.5rem)`,
            top: `calc(50% + ${position.y}px - 1.5rem)`,
            transform: isActive ? 'scale(1.1)' : 'scale(1)',
          }}
        />
        {isSprinting.current && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse">
            <div className="w-full h-full rounded-full border-2 border-orange-500/30 scale-125" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center">
        {label && <span className="text-white/20 text-[10px] font-black uppercase tracking-widest italic">{label}</span>}
        <span className={`text-[8px] font-bold transition-opacity duration-300 ${isSprinting.current ? 'text-orange-400 opacity-100' : 'text-white/10 opacity-0'}`}>SPRINT ACTIVE</span>
      </div>
    </div>
  );
};
