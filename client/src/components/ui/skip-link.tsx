import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "absolute top-0 left-0 z-[9999] px-4 py-2 bg-[var(--accent-purple)] text-white font-medium",
        "transform -translate-y-full focus:translate-y-0 transition-transform",
        "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2",
        className
      )}
    >
      {children}
    </a>
  );
}