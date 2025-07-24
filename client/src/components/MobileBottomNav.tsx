import { Home, Music, Headphones, User, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCartContext } from "@/components/cart-provider";
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { useAudioStore } from "@/store/useAudioStore";

const navItems = [
  {
    icon: Home,
    label: "Home",
    href: "/",
  },
  {
    icon: Music,
    label: "Beats",
    href: "/shop",
  },
  {
    icon: Headphones,
    label: "Services",
    href: "/mixing-mastering",
  },
  {
    icon: User,
    label: "Profile",
    href: "/dashboard",
    requiresAuth: true,
  },
  {
    icon: ShoppingCart,
    label: "Cart",
    href: "/cart",
    showBadge: true,
  },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const { getItemCount } = useCartContext();
  const { currentTrack } = useAudioStore();
  const isMobile = useIsMobile();

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });
  
  const cartItemCount = getItemCount();

  // Detect if keyboard is open on mobile
  useEffect(() => {
    const handleResize = () => {
      // On mobile devices, when the keyboard opens, the viewport height decreases significantly
      const isLikelyKeyboard = window.innerHeight < window.screen.height * 0.75;
      setIsKeyboardOpen(isLikelyKeyboard);
    };

    const handleFocusIn = () => {
      // Additional check when input elements are focused
      setTimeout(() => {
        const isLikelyKeyboard = window.innerHeight < window.screen.height * 0.75;
        setIsKeyboardOpen(isLikelyKeyboard);
      }, 300);
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        setIsKeyboardOpen(false);
      }, 300);
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Don't show on desktop screens
  if (!isMobile) {
    return null;
  }

  // Don't show when keyboard is open or when modals are open
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <div 
      className={`
        fixed left-0 right-0 z-40 bg-[var(--dark-gray)] border-t border-[var(--medium-gray)] md:hidden
        safe-area-inset-bottom transition-all duration-300
        ${currentTrack ? 'bottom-16' : 'bottom-0'}
      `}
    >
      <nav className="flex justify-around items-center py-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          // Hide auth-required items if not logged in
          if (item.requiresAuth && !user) {
            return null;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center space-y-1 py-2 px-3 min-w-[60px] relative transition-colors",
                "min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)] rounded-lg",
                isActive 
                  ? "text-[var(--accent-purple)]" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.showBadge && cartItemCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs bg-[var(--accent-purple)] text-white border-0"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}