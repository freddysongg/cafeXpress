import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, Mail, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const userData = { email, password };

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      console.log('Login Response:', data); // Debugging line

      if (response.ok && data.status === 'success') {
        console.log(data); // This will show the entire response object
        if (data.token) {
          const decoded = jwtDecode<DecodedToken>(data.token);
          const userId = decoded.id; // Assuming `id` is the field where `userId` is stored
        
          console.log("User ID from token:", userId);
        } else {
          console.log("No token found.");
        }
        const { token, userId } = data.data;

        login(userId, token);
        navigate('/');
      } else {
        setError(
          data.message || 'Sign in failed. Please check your credentials.'
        );
      }
    } catch (error) {
      console.error('Login Error:', error); // Debugging line
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-coffee-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-coffee-600 hover:text-coffee-700"
          >
            <Coffee className="w-8 h-8" />
            <span className="text-2xl font-bold">CafeXpress</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-coffee-800">
            Welcome back
          </h2>
          <p className="mt-2 text-coffee-600">Sign in to your account</p>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-coffee-700"
            >
              Email address
            </label>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-coffee-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-coffee-700"
            >
              Password
            </label>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-coffee-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-coffee-500 focus:ring-coffee-400 border-coffee-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-coffee-600"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-coffee-500 hover:text-coffee-600"
              >
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-coffee-500 hover:bg-coffee-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coffee-400"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-coffee-600">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-medium text-coffee-500 hover:text-coffee-600"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
