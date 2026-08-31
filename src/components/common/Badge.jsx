import React from 'react';

/**
 * Reusable Luxury Badge Component
 */
export default function Badge({ 
  children, 
  variant = 'gold', 
  size = 'md',
  className = '',
  icon: Icon
}) {
  const variantStyles = {
    gold: 'bg-[#E5A93C]/10 text-[#E5A93C] border-[#E5A93C]/30',
    dark: 'bg-zinc-900/80 text-zinc-300 border-zinc-800',
    success: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40',
    outline: 'bg-transparent text-zinc-400 border-zinc-700/50'
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-xs md:text-sm px-3 py-1',
    lg: 'text-sm px-4 py-1.5'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}
