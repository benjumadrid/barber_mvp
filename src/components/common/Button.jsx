import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable Luxury Button Component supporting internal Links and standard buttons
 */
export default function Button({
  children,
  to,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconPosition = 'right',
  onClick,
  disabled = false,
  type = 'button',
  fullWidth = false
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E5A93C]/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variantStyles = {
    primary: 'bg-[#E5A93C] text-zinc-950 hover:bg-[#F6CA65] shadow-lg shadow-[#E5A93C]/15 hover:shadow-[#E5A93C]/25',
    secondary: 'bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-700/60 hover:border-[#E5A93C]/40',
    outline: 'bg-transparent text-zinc-200 border border-zinc-700 hover:border-[#E5A93C] hover:text-[#E5A93C]',
    ghost: 'bg-transparent text-zinc-300 hover:text-[#E5A93C] hover:bg-zinc-800/40',
    goldOutline: 'bg-transparent text-[#E5A93C] border border-[#E5A93C]/50 hover:bg-[#E5A93C]/10'
  };

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
    xl: 'text-lg px-8 py-4 gap-3'
  };

  const combinedClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`group ${combinedClasses}`}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`group ${combinedClasses}`}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`group ${combinedClasses}`}>
      {content}
    </button>
  );
}
