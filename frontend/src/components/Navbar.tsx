import React from 'react';
import { Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const isExplore = location.pathname === '/explore';

  return (
    <nav
      className={`fixed w-full z-50 ${isExplore ? 'bg-coffee-50 shadow-sm' : 'bg-transparent'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <img
              src="/icon.png"
              alt="Coffee icon"
              className={`w-6 h-6 ${isExplore ? 'text-coffee-600' : 'text-white'}`}
            />
            <Link
              to="/"
              className={`text-2xl font-bold ${isExplore ? 'text-coffee-800' : 'text-white'}`}
            >
              cafeXpress
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink href="/explore" isExplore={isExplore}>
              Explore
            </NavLink>
            <NavLink href="/about" isExplore={isExplore}>
              About
            </NavLink>
            <NavLink href="/help" isExplore={isExplore}>
              Help
            </NavLink>
            <button
              className={`${isExplore ? 'bg-coffee-400 text-white hover:bg-coffee-500' : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20'} px-6 py-2 rounded-full transition-all duration-300`}
            >
              Sign In
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden ${isExplore ? 'text-coffee-800' : 'text-white'}`}
          >
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
  isExplore,
}: {
  href: string;
  children: React.ReactNode;
  isExplore: boolean;
}) => (
  <Link
    to={href}
    className={`${isExplore ? 'text-coffee-600 hover:text-coffee-800' : 'text-white/90 hover:text-white'} transition-colors duration-300`}
  >
    {children}
  </Link>
);

export default Navbar;
