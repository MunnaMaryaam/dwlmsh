import React from 'react';

interface DiamondWorldLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
  tone?: 'white' | 'black' | 'original';
}

/** Shared Diamond World DW vector logo. */
export const DiamondWorldLogo: React.FC<DiamondWorldLogoProps> = ({
  className = 'w-10 h-10',
  size,
  tone = 'black'
}) => {
  const style = size ? { width: size, height: size } : undefined;
  const filter = tone === 'white' ? 'brightness(0) invert(1)' : tone === 'black' ? 'brightness(0)' : undefined;

  return (
    <img
      src="/diamond-world-dw.svg"
      alt="Diamond World DW Logo"
      className={`inline-block select-none shrink-0 object-contain ${className}`}
      style={{ ...style, filter }}
      draggable={false}
    />
  );
};
