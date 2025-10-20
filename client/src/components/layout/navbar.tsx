import { useCartContext } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SignOutButton, useUser } from "@clerk/clerk-react";
import { LogOut, Menu, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { getItemCount } = useCartContext();
  const [scrollY, setScrollY] = useState(0);
  const isHomePage = location === "/";

  // Use Clerk for authentication
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Beats" },
    { href: "/membership", label: "Membership" },
    { href: "/mixing-mastering", label: "Services" },
    { href: "/about", label: "About" },
    // Si non connecté, le lien Dashboard envoie vers /login
    { href: isSignedIn ? "/dashboard" : "/login", label: "Dashboard" },
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "FAQ" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  const itemCount = getItemCount();

  return (
    <nav
      className={
        isHomePage
          ? "fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-transparent"
          : "fixed top-0 left-0 right-0 z-50 bg-[var(--deep-black)]/95 backdrop-blur-md border-b border-[var(--medium-gray)]"
      }
      style={
        isHomePage
          ? {
              backgroundColor: `hsla(0, 0%, 4.3%, ${Math.min(0.95, Math.max(0, scrollY / 300))})`,
              borderBottomColor: `hsla(0, 0%, 17.6%, ${Math.min(1, Math.max(0, scrollY / 300))})`,
              backdropFilter: scrollY > 50 ? "blur(8px)" : "none",
              transition:
                "background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
            }
          : {}
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 lg:h-24">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center" aria-label="Brolab Home">
              <img
                src="/attached_assets/Brolab logo trans_1752780961016.png"
                alt="BroLab Entertainment"
                className="h-8 w-auto sm:h-10 md:h-14 lg:h-16"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link text-sm lg:text-base ${isActive(item.href) ? "text-[var(--accent-purple)]" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Cart & User Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/cart"
              className="relative p-2 text-white hover:text-[var(--accent-purple)] transition-colors"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--accent-purple)] text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {isSignedIn ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="text-white text-sm lg:text-base">
                  Welcome, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
                </span>
                <SignOutButton>
                  <Button variant="outline" className="flex items-center gap-2 text-sm">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Logout</span>
                  </Button>
                </SignOutButton>
              </div>
            ) : (
              <Link href="/login">
                <Button className="hidden md:flex items-center gap-2 btn-primary text-sm">
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">Login</span>
                </Button>
              </Link>
            )}

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-white hover:bg-[var(--medium-gray)] min-w-[44px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)]"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:w-80 bg-[var(--dark-gray)] border-l border-[var(--medium-gray)] h-[90vh] overflow-y-auto"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <img
                      src="/attached_assets/Brolab logo trans_1752780961016.png"
                      alt="BroLab Entertainment"
                      className="h-10 w-auto sm:h-12"
                    />
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex-1">
                    <div className="space-y-3 sm:space-y-4">
                      {navItems.map(item => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            block px-4 py-3 text-base sm:text-lg font-medium rounded-lg transition-colors
                            ${
                              isActive(item.href)
                                ? "text-[var(--accent-purple)] bg-[var(--accent-purple)]/10"
                                : "text-white hover:text-[var(--accent-purple)] hover:bg-[var(--medium-gray)]"
                            }
                          `}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </nav>

                  {/* User Actions */}
                  <div className="border-t border-[var(--medium-gray)] pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                    <Link
                      href="/cart"
                      className="flex items-center gap-3 px-4 py-3 text-white hover:text-[var(--accent-purple)] hover:bg-[var(--medium-gray)] rounded-lg transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>Cart ({getItemCount()})</span>
                    </Link>

                    {isSignedIn ? (
                      <div className="space-y-2">
                        <div className="px-4 py-2 text-sm text-gray-400">
                          Welcome,{" "}
                          {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
                        </div>
                        <SignOutButton>
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </Button>
                        </SignOutButton>
                      </div>
                    ) : (
                      <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full justify-start gap-2 btn-primary">
                          <User className="w-4 h-4" />
                          Login
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--dark-gray)] border-t border-[var(--medium-gray)]">
          <div className="px-4 py-2 space-y-2">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2 nav-link ${
                  isActive(item.href) ? "text-[var(--accent-purple)]" : ""
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Auth Section */}
            <div className="border-t border-[var(--medium-gray)] pt-2 mt-2">
              {isSignedIn ? (
                <div className="space-y-2">
                  <div className="py-2 text-white text-sm">
                    Welcome, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"}
                  </div>
                  <SignOutButton>
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </SignOutButton>
                </div>
              ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full flex items-center gap-2 btn-primary">
                    <User className="w-4 h-4" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
