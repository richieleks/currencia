interface LogoProps {
  variant?: 'full' | 'icon' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12'
  };

  const logoSrc = {
    full: '/src/assets/currencia-logo.svg',
    icon: '/src/assets/currencia-icon.svg',
    wordmark: '/src/assets/currencia-wordmark.svg'
  };

  return (
    <img 
      src={logoSrc[variant]}
      alt="Currencia"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
}