import { useCartContext } from "@/components/cart-provider";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";
import { useAudioStore } from "@/store/useAudioStore";
import { useUser } from "@clerk/clerk-react";
import { Headphones, Home, Music, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

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

  // Check if user is authenticated using Clerk
  const { user, isSignedIn } = useUser();

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
        ${currentTrack ? "bottom-16" : "bottom-0"}
      `}
    >
      <nav className="flex justify-around items-center py-2 px-2 sm:px-4">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            location === item.href || (item.href !== "/" && location.startsWith(item.href));

          // Hide auth-required items if not logged in
          if (item.requiresAuth && !isSignedIn) {
            return null;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center space-y-1 py-2 px-2 sm:px-3 min-w-[50px] sm:min-w-[60px] relative transition-colors",
                "min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)] rounded-lg",
                isActive ? "text-[var(--accent-purple)]" : "text-gray-400 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                {item.showBadge && cartItemCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-xs bg-[var(--accent-purple)] text-white border-0"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
