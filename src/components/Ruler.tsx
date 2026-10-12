import React from 'react';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number;
  zoom: number;
  offset: number;
  mousePos: number;
}

export const Ruler: React.FC<RulerProps> = ({
  orientation,
  length,
  zoom,
  offset,
  mousePos,
}) => {
  const isHorizontal = orientation === 'horizontal';

  // Determine tick interval based on zoom level
  let step = 100;
  if (zoom > 2) step = 20;
  else if (zoom > 0.8) step = 50;
  else if (zoom < 0.4) step = 200;

  const ticks: { pos: number; label?: number }[] = [];
  const startCoord = Math.floor(-offset / zoom / step) * step;
  const endCoord = Math.ceil((length - offset) / zoom / step) * step;

  for (let c = startCoord; c <= endCoord; c += step) {
    const screenPos = c * zoom + offset;
    if (screenPos >= 0 && screenPos <= length) {
      ticks.push({ pos: screenPos, label: c });
    }
  }

  return (
    <div
      className={`relative bg-[#232323] border-[#383838] select-none text-[8px] font-mono text-[#777777] overflow-hidden ${
        isHorizontal ? 'h-4 w-full border-b' : 'w-4 h-full border-r'
      }`}
    >
      {ticks.map((t, i) => (
        <div
          key={i}
          className="absolute"
          style={
            isHorizontal
              ? { left: `${t.pos}px`, top: 0, bottom: 0 }
              : { top: `${t.pos}px`, left: 0, right: 0 }
          }
        >
          {isHorizontal ? (
            <div className="flex flex-col h-full justify-between">
              <span className="leading-none pl-0.5">{t.label}</span>
              <div className="w-[1px] h-1.5 bg-[#555555]" />
            </div>
          ) : (
            <div className="flex w-full justify-between items-start">
              <span className="leading-none pt-0.5 pl-0.5">{t.label}</span>
              <div className="h-[1px] w-1.5 bg-[#555555]" />
            </div>
          )}
        </div>
      ))}

      {/* Mouse position tracking hairline marker */}
      {mousePos >= 0 && mousePos <= length && (
        <div
          className="absolute bg-[#00a8ff] z-10 pointer-events-none"
          style={
            isHorizontal
              ? { left: `${mousePos}px`, top: 0, width: '1px', height: '100%' }
              : { top: `${mousePos}px`, left: 0, width: '100%', height: '1px' }
          }
        />
      )}
    </div>
  );
};
