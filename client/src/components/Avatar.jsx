import React, { useMemo } from 'react';
import { User } from 'lucide-react';

const Avatar = ({ name, imageUrl, width = 40, height = 40, className = '' }) => {
  const avatarName = useMemo(() => {
    if (!name) return '';
    const splitName = name.trim().split(' ');
    return splitName.length > 1
      ? `${splitName[0][0]}${splitName[1][0]}`.toUpperCase()
      : splitName[0][0].toUpperCase();
  }, [name]);

  const colorVariants = {
    0: 'bg-violet-500 hover:bg-violet-600',
    1: 'bg-teal-500 hover:bg-teal-600',
    2: 'bg-pink-500 hover:bg-pink-600',
    3: 'bg-emerald-500 hover:bg-emerald-600',
    4: 'bg-amber-500 hover:bg-amber-600',
    5: 'bg-blue-500 hover:bg-blue-600',
    6: 'bg-cyan-500 hover:bg-cyan-600',
    7: 'bg-indigo-500 hover:bg-indigo-600',
    8: 'bg-rose-500 hover:bg-rose-600'
  };

  const colorIndex = useMemo(() => {
    if (!name) return 0;
    return name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 9;
  }, [name]);

  const baseStyles = `
    inline-flex items-center justify-center 
    rounded-full overflow-hidden 
    transition-all duration-200 ease-in-out
    ring-2 ring-offset-2 ring-offset-slate-900 
    shadow-lg
  `;

  const dimensions = `w-[${width}px] h-[${height}px]`;

  if (imageUrl && imageUrl !== "default.png") {
    return (
      <div 
        className={`${baseStyles} ${dimensions} ${className} ring-slate-700 hover:ring-slate-600`}
        style={{ width, height }}
      >
        <div className="relative w-full h-full group">
          <img
            src={imageUrl}
            alt={name || 'User avatar'}
            className="w-full h-full object-cover transform transition-transform duration-200 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
        </div>
      </div>
    );
  }

  if (name) {
    return (
      <div
        className={`
          ${baseStyles} 
          ${dimensions} 
          ${colorVariants[colorIndex]}
          ${className}
          ring-slate-700
          hover:ring-slate-600
          cursor-default
          font-semibold
          text-white
          transform hover:scale-105
        `}
        style={{ 
          width, 
          height,
          fontSize: `${Math.max(width * 0.4, 14)}px`
        }}
      >
        {avatarName}
      </div>
    );
  }

  return (
    <div 
      className={`
        ${baseStyles} 
        ${dimensions} 
        ${className}
        bg-slate-700 
        hover:bg-slate-600
        text-slate-300
        hover:text-white
        ring-slate-700
        hover:ring-slate-600
        transform hover:scale-105
      `}
      style={{ width, height }}
    >
      <User size={Math.max(width * 0.6, 16)} />
    </div>
  );
};

export default Avatar;