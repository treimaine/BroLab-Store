/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--color-border)", /* white-10 */
        input: "var(--color-input)", /* gray-800 */
        ring: "var(--color-ring)", /* cyan-400 */
        background: "var(--color-background)", /* true-black */
        foreground: "var(--color-foreground)", /* white */
        primary: {
          DEFAULT: "var(--color-primary)", /* gray-950 */
          foreground: "var(--color-primary-foreground)", /* white */
        },
        secondary: {
          DEFAULT: "var(--color-secondary)", /* gray-900 */
          foreground: "var(--color-secondary-foreground)", /* white */
        },
        destructive: {
          DEFAULT: "var(--color-destructive)", /* red-500 */
          foreground: "var(--color-destructive-foreground)", /* white */
        },
        muted: {
          DEFAULT: "var(--color-muted)", /* gray-800 */
          foreground: "var(--color-muted-foreground)", /* gray-400 */
        },
        accent: {
          DEFAULT: "var(--color-accent)", /* cyan-400 */
          foreground: "var(--color-accent-foreground)", /* gray-950 */
        },
        popover: {
          DEFAULT: "var(--color-popover)", /* gray-800 */
          foreground: "var(--color-popover-foreground)", /* white */
        },
        card: {
          DEFAULT: "var(--color-card)", /* gray-900 */
          foreground: "var(--color-card-foreground)", /* white */
        },
        success: {
          DEFAULT: "var(--color-success)", /* green-400 */
          foreground: "var(--color-success-foreground)", /* gray-950 */
        },
        warning: {
          DEFAULT: "var(--color-warning)", /* amber-500 */
          foreground: "var(--color-warning-foreground)", /* gray-950 */
        },
        error: {
          DEFAULT: "var(--color-error)", /* red-500 */
          foreground: "var(--color-error-foreground)", /* white */
        },
        // Brand specific colors
        surface: "var(--color-surface)", /* gray-800 */
        'text-primary': "var(--color-text-primary)", /* white */
        'text-secondary': "var(--color-text-secondary)", /* gray-400 */
        gold: "var(--color-gold)", /* yellow-400 */
        conversion: "var(--color-conversion)", /* orange-500 */
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'hero': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display': ['2.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading': ['2rem', { lineHeight: '1.3', fontWeight: '600' }],
        'subheading': ['1.5rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 4s ease-in-out infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "waveform": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
      boxShadow: {
        'subtle': 'var(--shadow-subtle)',
        'card': 'var(--shadow-card)',
        'modal': 'var(--shadow-modal)',
        'glow-accent': '0 0 20px rgba(0, 212, 255, 0.4)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'elastic': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}