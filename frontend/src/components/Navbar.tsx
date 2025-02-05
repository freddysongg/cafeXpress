import React from 'react';
import { User, Menu, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const isAuth =
    location.pathname === '/signin' || location.pathname === '/signup';
  const isHome = location.pathname === '/';

  // Don't show navbar on auth pages
  if (isAuth) return null;

  return (
    <nav
      className={`fixed w-full z-50 ${isHome ? 'bg-transparent' : 'bg-coffee-100/95 backdrop-blur-sm shadow-sm'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <img src="/icon.png" alt="CafeXpress Logo" className="w-6 h-6" />
            <Link
              to="/"
              className={`text-2xl font-bold ${isHome ? 'text-white' : 'text-coffee-800'}`}
            >
              CafeXpress
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink href="/explore" isHome={isHome}>
              Explore
            </NavLink>
            <NavLink href="/profile" isHome={isHome}>
              <User className="w-5 h-5" />
            </NavLink>
            <NavLink href="/settings" isHome={isHome}>
              <Settings className="w-5 h-5" />
            </NavLink>
            <Link
              to="/signin"
              className="bg-coffee-500 text-white px-6 py-2 rounded-full hover:bg-coffee-600 transition-all duration-300"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-coffee-800">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({
  href,
  children,
  isHome,
}: {
  href: string;
  children: React.ReactNode;
  isHome: boolean;
}) => (
  <Link
    to={href}
    className={`transition-colors duration-300 flex items-center ${
      isHome
        ? 'text-white hover:text-white/80'
        : 'text-coffee-700 hover:text-coffee-900'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
