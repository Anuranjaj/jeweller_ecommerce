import { FaInstagram, FaFacebookSquare, FaPinterestP } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Footer link columns — easy to update
const shopLinks = [
  { label: 'All Jewelry', to: '/shop' },
  { label: 'Rings', to: '/shop?category=rings' },
  { label: 'Necklaces', to: '/shop?category=necklaces' },
  { label: 'Earrings', to: '/shop?category=earrings' },
  { label: 'Bracelets', to: '/shop?category=bracelets' },
  { label: 'Watches', to: '/shop?category=watches' },
];

const aboutLinks = [
  { label: 'Our Story', to: '/about' },
  { label: 'Craftsmanship', to: '/about#craftsmanship' },
  { label: 'Sustainability', to: '/about#sustainability' },
  { label: 'Press', to: '/press' },
  { label: 'Careers', to: '/careers' },
];

// Reusable footer link style
const FooterLink = ({ to, label }) => (
  <li>
    <Link
      to={to}
      className="text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors duration-300"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {label}
    </Link>
  </li>
);

const Footer = () => {
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    // TODO: wire up to Django API
  };

  return (
    <footer className="bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] mt-[var(--spacing-stack-xl)]">

      <div className="border-t border-[var(--color-outline-variant)]" />

      {/* Main Footer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-gutter)] px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-[var(--spacing-stack-lg)] max-w-[var(--spacing-container-max)] mx-auto">

        {/* ── Brand + Socials ── */}
        <div className="col-span-1 flex flex-col gap-6">
          <Link
            to="/"
            className="text-[24px] font-normal tracking-[0.25em] text-[var(--color-on-background)] uppercase"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            LUMIÈRE
          </Link>
          <p
            className="text-sm text-[var(--color-on-surface-variant)] max-w-xs"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Timeless designs. Unmatched quality. Made to be cherished forever.
          </p>
          <div className="flex gap-4 mt-2 text-[var(--color-on-surface-variant)]">
            <a href="#" aria-label="Instagram" className="hover:text-[var(--color-primary)] transition-colors">
              <FaInstagram size={20} />
            </a>
            <a href="#" aria-label="Facebook" className="hover:text-[var(--color-primary)] transition-colors">
              <FaFacebookSquare size={20} />
            </a>
            <a href="#" aria-label="Pinterest" className="hover:text-[var(--color-primary)] transition-colors">
              <FaPinterestP size={20} />
            </a>
          </div>
        </div>

        {/* ── Shop Links ── */}
        <div className="col-span-1">
          <h4
            className="text-xs font-semibold tracking-[0.1em] text-[var(--color-on-background)] mb-6 uppercase"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Shop
          </h4>
          <ul className="flex flex-col gap-4">
            {shopLinks.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </ul>
        </div>

        {/* ── About Links ── */}
        <div className="col-span-1">
          <h4
            className="text-xs font-semibold tracking-[0.1em] text-[var(--color-on-background)] mb-6 uppercase"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            About
          </h4>
          <ul className="flex flex-col gap-4">
            {aboutLinks.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </ul>
        </div>

        {/* ── Newsletter ── */}
        <div className="col-span-1 flex flex-col gap-4">
          <h4
            className="text-xs font-semibold tracking-[0.1em] text-[var(--color-on-background)] mb-2 uppercase"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Newsletter
          </h4>
          <p
            className="text-sm text-[var(--color-on-surface-variant)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Be the first to know about new collections and exclusive offers.
          </p>
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex border-b border-[var(--color-outline-variant)] focus-within:border-[var(--color-primary)] transition-colors pb-2 mt-2"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-[var(--color-on-background)] placeholder:text-[var(--color-on-surface-variant)]/50"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>
        </div>

      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-[var(--color-outline-variant)]/30 py-6">
        <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p
            className="text-xs text-[var(--color-on-surface-variant)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            © {new Date().getFullYear()} Lumière Fine Jewelry. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;