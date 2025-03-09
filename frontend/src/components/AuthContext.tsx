import { createContext, useState, useEffect, ReactNode } from 'react';

interface User {
  // location: string;
  username: string;
  email: string;
  description?: string;
  createdAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (userId: string, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Fetch user data from API
  const fetchUserData = async (userId: string, token: string) => {
    try {
      const response = await fetch(`http://localhost:8000/user/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();

      setUser(data.data); // Set user details
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    // const userId = localStorage.getItem('userId');

    if (!token) {
      console.error('Token is missing');
      return;
    }

    setIsAuthenticated(true);
    // fetchUserData(userId, token);
  }, []);

  const login = (userId: string, token: string) => {
    console.log('Logging in with userId:', userId, 'and token:', token); // Debugging

    // localStorage.setItem('userId', userId);
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    fetchUserData(userId, token);
  };

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
