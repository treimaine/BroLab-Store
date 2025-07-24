import { Link, useLocation } from 'wouter';
import { Instagram, Twitter, Youtube } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [location] = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const isHomePage = location === '/';

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  // Calculate opacity based on scroll position for home page
  const getFooterOpacity = () => {
    if (!isHomePage) return 'bg-[var(--deep-black)]/95 backdrop-blur-md border-t border-[var(--medium-gray)]';
    
    // Start more transparent, become more opaque as user scrolls
    const scrollThreshold = 500; // Adjust this value as needed
    const opacity = Math.min(0.95, Math.max(0.1, scrollY / scrollThreshold));
    const borderOpacity = Math.min(1, Math.max(0.3, scrollY / scrollThreshold));
    
    return `bg-[var(--deep-black)] backdrop-blur-sm border-t border-[var(--medium-gray)]`;
  };

  return (
    <footer 
      className={isHomePage ? "bg-transparent border-t border-transparent" : "bg-[var(--deep-black)]/95 backdrop-blur-md border-t border-[var(--medium-gray)]"}
      style={isHomePage ? {
        backgroundColor: `hsla(0, 0%, 4.3%, ${Math.min(0.95, Math.max(0, scrollY / 500))})`,
        borderTopColor: `hsla(0, 0%, 17.6%, ${Math.min(1, Math.max(0, scrollY / 500))})`,
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      } : {}}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="mb-4 block" aria-label="Brolab Home">
              <img 
                src="/attached_assets/Brolab logo trans_1752780961016.png" 
                alt="BroLab Entertainment" 
                className="h-12 w-auto md:h-16 lg:h-20"
              />
            </Link>
            <p className="text-gray-300 mb-6 max-w-md">
              Professional beats and instrumentals for the modern music producer. 
              Quality sounds that inspire creativity and drive success.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 bg-[var(--medium-gray)] hover:bg-[var(--accent-purple)] rounded-full flex items-center justify-center transition-colors"
              >
                <Instagram className="w-5 h-5 text-white" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[var(--medium-gray)] hover:bg-[var(--accent-purple)] rounded-full flex items-center justify-center transition-colors"
              >
                <Twitter className="w-5 h-5 text-white" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[var(--medium-gray)] hover:bg-[var(--accent-purple)] rounded-full flex items-center justify-center transition-colors"
              >
                <Youtube className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
                  Beats
                </Link>
              </li>

              <li>
                <Link href="/contact" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
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
                <Link href="/terms" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/licensing" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
                  Licensing
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/copyright" className="text-gray-300 hover:text-[var(--accent-purple)] transition-colors">
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
              <span className="text-sm">Visa • Mastercard • PayPal • Stripe</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
