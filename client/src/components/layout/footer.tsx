import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

// SVG icons to replace deprecated lucide-react icons
interface IconProps {
  readonly className?: string;
}

function InstagramIcon({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function XIcon({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}

function YoutubeIcon({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

export function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();
  const [location] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const isHomePage = location === "/";

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = (): void => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  return (
    <footer
      className={
        isHomePage
          ? "bg-transparent border-t border-transparent"
          : "bg-[var(--deep-black)]/95 backdrop-blur-md border-t border-[var(--medium-gray)]"
      }
      style={
        isHomePage
          ? {
              backgroundColor: `hsla(0, 0%, 4.3%, ${Math.min(0.95, Math.max(0, scrollY / 500))})`,
              borderTopColor: `hsla(0, 0%, 17.6%, ${Math.min(1, Math.max(0, scrollY / 500))})`,
              transition: "background-color 0.3s ease, border-color 0.3s ease",
            }
          : {}
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="mb-4 block" aria-label="BroLab Home">
              <img
                src="/attached_assets/Brolab logo trans_1752780961016.png"
                alt="BroLab Entertainment"
                className="h-12 w-auto md:h-16 lg:h-20"
              />
            </Link>
            <p className="text-gray-300 mb-6 max-w-md">
              Professional beats and instrumentals for the modern music producer. Quality sounds
              that inspire creativity and drive success.
            </p>
            <div className="flex space-x-4">
              <button
                type="button"
                aria-label="Follow us on Instagram"
                className="w-10 h-10 bg-[var(--medium-gray)] hover:bg-[var(--accent-purple)] rounded-full flex items-center justify-center transition-colors"
              >
                <InstagramIcon className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                aria-label="Follow us on X"
                className="w-10 h-10 bg-[var(--medium-gray)] hover:bg-[var(--accent-purple)] rounded-full flex items-center justify-center transition-colors"
              >
                <XIcon className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                aria-label="Subscribe to our YouTube channel"
                className="w-10 h-10 bg-[var(--medium-gray)] hover:bg-[var(--accent-purple)] rounded-full flex items-center justify-center transition-colors"
              >
                <YoutubeIcon className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Beats
                </Link>
              </li>

              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/licensing"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Licensing
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/copyright"
                  className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors"
                >
                  Copyright
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-[var(--medium-gray)] my-8" />

        <div className="flex flex-col md:flex-row items-center justify-between">
          <p className="text-gray-300 text-sm">
            © {currentYear} BroLab Entertainment. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-gray-300 text-sm">Secure payments powered by</span>
            <div className="flex space-x-2 text-gray-300">
              <span className="text-sm">Visa • Mastercard • PayPal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
