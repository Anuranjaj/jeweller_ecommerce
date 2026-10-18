import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

// Navigation links — easy to add/remove
const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Collections', to: '/Collections' },
  { label: 'About Us', to: '/About' },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const accountDropdownRef = useRef(null);

  const closeMenu = () => setIsMenuOpen(false);

  // Close account dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
      closeMenu();
    }
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    closeMenu();
    await logout();
    navigate('/');
  };

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Active link style helper
  const navLinkClass = ({ isActive }) =>
    `text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300 ${
      isActive
        ? 'text-[var(--color-primary)] border-b border-[var(--color-primary)] pb-1'
        : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-surface)] w-full shadow-sm">
      <nav className="flex justify-between items-center w-full px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-5 max-w-[var(--spacing-container-max)] mx-auto border-b border-transparent">

        {/* ── Logo ── */}
        <div className="flex-1 md:flex-none flex items-center">
          <Link
            to="/"
            className="text-[24px] font-normal tracking-[0.25em] text-[var(--color-on-background)] uppercase"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            LUMIÈRE
          </Link>
        </div>

        {/* ── Desktop Nav Links ── */}
        <ul className="hidden md:flex gap-[var(--spacing-gutter)] items-center justify-center flex-1">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === '/'} className={navLinkClass}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* ── Action Icons ── */}
        <div className="flex items-center gap-5 justify-end flex-1 md:flex-none">

          {/* Search */}
          <div className="relative flex items-center">
            {isSearchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-40 sm:w-52 border-b border-[var(--color-primary)] text-sm py-1 px-1 focus:outline-none bg-transparent text-[var(--color-on-background)]"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close search"
                  className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-background)] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
                className="text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors group cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                  search
                </span>
              </button>
            )}
          </div>

          {/* Account Section (desktop) */}
          <div className="relative hidden md:block" ref={accountDropdownRef}>
            {isAuthenticated ? (
              <div>
                <button
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-full border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface)] transition-all duration-200 cursor-pointer shadow-xs"
                  aria-label="User account menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-semibold flex items-center justify-center tracking-tight">
                    {getInitials(user?.name || user?.username)}
                  </div>
                  <span className="text-xs font-medium tracking-wide max-w-[120px] truncate">
                    {user?.name || user?.username || 'Account'}
                  </span>
                  <span
                    className={`material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)] transition-transform duration-200 ${
                      isAccountMenuOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {/* Account Dropdown Menu */}
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/60 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-low)]/50 rounded-t-xl">
                      <p className="text-[10px] uppercase font-semibold tracking-wider text-[var(--color-on-surface-variant)]">
                        Signed In As
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate mt-0.5">
                        {user?.name || user?.username}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-[var(--color-on-surface-variant)] truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>

                    <div className="py-1">
                      {Boolean(user?.is_staff || user?.is_superuser) && (
                        <Link
                          to="/admin"
                          onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--color-primary)] font-semibold hover:bg-[var(--color-surface-container-low)] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">shield_person</span>
                          Admin Console
                        </Link>
                      )}

                      <Link
                        to="/cart"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                        My Purchases
                      </Link>

                      <Link
                        to="/shop"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">storefront</span>
                        Browse Collection
                      </Link>
                    </div>

                    <div className="pt-1 mt-1 border-t border-[var(--color-outline-variant)]/40">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                aria-label="Account"
                className="text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors group flex items-center"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                  person
                </span>
              </Link>
            )}
          </div>

          {/* Shopping Bag */}
          <Link
            to="/cart"
            aria-label="Shopping bag"
            className="text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors group flex items-center relative"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
              shopping_bag
            </span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[var(--color-on-surface)] text-[var(--color-surface)] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-label-caps font-bold">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors md:hidden cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Dropdown Menu ── */}
      {isMenuOpen && (
        <nav className="md:hidden bg-[var(--color-surface)] border-b border-[var(--color-outline-variant)]/30 px-[var(--spacing-margin-mobile)] py-6 flex flex-col gap-5">

          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-on-background)]"
            />
            <span className="material-symbols-outlined absolute left-3 top-2 text-[var(--color-on-surface-variant)] text-[18px]">
              search
            </span>
          </form>

          {/* User Status in Mobile Menu */}
          {isAuthenticated ? (
            <div className="p-3 bg-[var(--color-surface-container-low)] rounded-lg border border-[var(--color-outline-variant)]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold flex items-center justify-center">
                  {getInitials(user?.name || user?.username)}
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-on-surface)]">
                    {user?.name || user?.username}
                  </p>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-2 cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : null}

          {/* Mobile Nav Links */}
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={closeMenu}
              className={({ isActive }) =>
                `text-sm font-medium tracking-[0.05em] uppercase py-1 transition-colors ${
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {Boolean(user?.is_staff || user?.is_superuser) && (
            <Link
              to="/admin"
              onClick={closeMenu}
              className="text-sm font-semibold tracking-[0.05em] uppercase py-1 text-[var(--color-primary)] hover:underline flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">shield_person</span>
              Admin Console
            </Link>
          )}

          <Link
            to="/cart"
            onClick={closeMenu}
            className="text-sm font-medium tracking-[0.05em] uppercase py-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            My Purchases
          </Link>

          {/* Account link (mobile only if not logged in) */}
          {!isAuthenticated && (
            <Link
              to="/login"
              onClick={closeMenu}
              className="text-sm font-medium tracking-[0.05em] uppercase py-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Sign In / Register
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;