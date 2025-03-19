import React, { useState, useRef, useEffect } from 'react';
import { User, Menu, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { jwtDecode } from 'jwt-decode';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isAuth =
    location.pathname === '/signin' || location.pathname === '/signup';
  const isHome = location.pathname === '/';

  // Retrieve token from localStorage
  const token = localStorage.getItem('token');
  let userFirstName = '';
  let userLastName = '';

  if (token) {
    try {
      const decoded: any = jwtDecode(token); // Decode JWT
      userFirstName = decoded.firstName;
      userLastName = decoded.lastName;
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  }

  const { isAuthenticated, logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show navbar on auth pages
  if (isAuth) return null;

  return (
    <nav
      className={`fixed w-full z-50 ${isHome ? 'bg-transparent' : 'bg-coffee-100/95 backdrop-blur-sm shadow-sm'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <img src="/icon.png" alt="CafeXpress Logo" className="w-6 h-6" />
            <Link
              to="/"
              className={`text-2xl font-bold ${isHome ? 'text-white' : 'text-coffee-800'}`}
            >
              cafeXpress
            </Link>
            <NavLink
              href="/explore"
              isHome={isHome}
              className={`transition-colors duration-300 flex items-center px-4 py-2 rounded-full ${
                isHome
                  ? 'text-white hover:text-white/80 bg-white/20 hover:bg-white/30'
                  : 'text-coffee-700 hover:text-coffee-900 hover:bg-coffee-100 bg-coffee-50/50'
              }`}
            >
              Explore
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* <NavLink href="/explore" isHome={isHome} className="font-medium">
              Explore
            </NavLink> */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`transition-colors duration-300 flex items-center px-4 py-2 rounded-full ${
                    isHome
                      ? 'text-white hover:text-white/80 bg-white/20 hover:bg-white/30'
                      : 'text-coffee-700 hover:text-coffee-900 hover:bg-coffee-100 bg-coffee-50/50'
                  }`}
                >
                  <User className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm text-gray-600">Welcome,</p>
                      <p className="font-medium text-gray-900">
                        {userFirstName} {userLastName}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <div className="flex items-center text-red-500">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/signin"
                className="bg-coffee-500 text-white px-6 py-2 rounded-full hover:bg-coffee-600 transition-all duration-300"
              >
                Sign In
              </Link>
            )}
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
  className = '', // Accept className with a default value of an empty string
}: {
  href: string;
  children: React.ReactNode;
  isHome: boolean;
  className?: string;
}) => (
  <Link
    to={href}
    className={`transition-colors duration-300 flex items-center px-4 py-2 rounded-full ${className} ${
      isHome
        ? 'text-white hover:text-white/80 hover:bg-white/10'
        : 'text-coffee-700 hover:text-coffee-900 hover:bg-coffee-100 bg-coffee-50/50'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
