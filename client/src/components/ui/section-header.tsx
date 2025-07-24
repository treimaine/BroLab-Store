import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  centered?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  children,
  className,
  titleClassName,
  subtitleClassName,
  centered = false
}: SectionHeaderProps) {
  return (
    <div className={cn(
      "space-y-4",
      centered && "text-center",
      className
    )}>
      <h2 className={cn(
        "text-3xl lg:text-4xl font-bold text-white",
        titleClassName
      )}>
        {title}
      </h2>
      
      {subtitle && (
        <p className={cn(
          "text-xl text-gray-300",
          centered && "max-w-2xl mx-auto",
          subtitleClassName
        )}>
          {subtitle}
        </p>
      )}
      
      {children}
    </div>
  );
}