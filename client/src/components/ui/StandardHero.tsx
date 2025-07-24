import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StandardHeroProps {
  title: string;
  subtitle?: string;
  gradient?: boolean;
  centered?: boolean;
  children?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

/**
 * StandardHero - Consistent hero section component matching Home page styling
 * Provides gradient background, animated elements, and proper spacing
 */
export function StandardHero({
  title,
  subtitle,
  gradient = true,
  centered = true,
  children,
  className,
  titleClassName,
  subtitleClassName
}: StandardHeroProps) {
  return (
    <section className={cn(
      "relative pt-16 pb-20 overflow-hidden",
      className
    )}>
      {/* Gradient Background */}
      {gradient && (
        <>
          <div className="absolute inset-0 gradient-bg opacity-90"></div>
          <div className="absolute inset-0">
            <div className="w-96 h-96 bg-[var(--accent-purple)] rounded-full blur-3xl opacity-20 absolute -top-20 -right-20 animate-pulse"></div>
            <div className="w-80 h-80 bg-[var(--accent-cyan)] rounded-full blur-3xl opacity-15 absolute top-40 -left-20 animate-pulse delay-1000"></div>
          </div>
        </>
      )}
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className={cn(centered && "text-center")}>
          <h1 className={cn(
            "text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight",
            titleClassName
          )}>
            {title}
          </h1>
          
          {subtitle && (
            <p className={cn(
              "text-xl lg:text-2xl text-gray-300 mb-10 leading-relaxed",
              centered && "max-w-3xl mx-auto",
              subtitleClassName
            )}>
              {subtitle}
            </p>
          )}
          
          {children}
        </div>
      </div>
    </section>
  );
}