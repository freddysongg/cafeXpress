import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Coffee,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle,
} from 'lucide-react';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const isPasswordValid = (password: string) => {
    return {
      length: password.length >= 8,
      number: /\d/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const passwordRequirements = isPasswordValid(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !passwordRequirements.length ||
      !passwordRequirements.number ||
      !passwordRequirements.specialChar
    ) {
      alert('Please ensure your password meets all requirements.');
      return;
    }

    const userData = { firstName, lastName, username, email, password };

    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        localStorage.setItem('signUpSuccess', 'true');
        navigate('/signin');
      }
    } catch (error) {
      console.error('Signup error:', error);
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
            Create an account
          </h2>
          <p className="mt-2 text-coffee-600">Join CafeXpress today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-coffee-700"
            >
              First Name
            </label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-coffee-400 w-5 h-5" />
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Enter your first name"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-coffee-700"
            >
              Last Name
            </label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-coffee-400 w-5 h-5" />
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-coffee-700"
            >
              Username
            </label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-coffee-400 w-5 h-5" />
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Choose a username"
              />
            </div>
          </div>

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
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-coffee-400"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                {passwordRequirements.length ? (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                ) : (
                  <CheckCircle className="text-coffee-400 w-4 h-4" />
                )}
                <span>Password must be at least 8 characters long</span>
              </div>
              <div className="flex items-center gap-2">
                {passwordRequirements.number ? (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                ) : (
                  <CheckCircle className="text-coffee-400 w-4 h-4" />
                )}
                <span>Contains at least one number</span>
              </div>
              <div className="flex items-center gap-2">
                {passwordRequirements.specialChar ? (
                  <CheckCircle className="text-green-500 w-4 h-4" />
                ) : (
                  <CheckCircle className="text-coffee-400 w-4 h-4" />
                )}
                <span>Contains at least one special character</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-coffee-500 hover:bg-coffee-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coffee-400"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
