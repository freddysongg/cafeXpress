import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, Mail, Lock, User } from 'lucide-react';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = { firstName, lastName, username, email, password };

    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        navigate('/signin'); // Redirect user upon successful signup
      }
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const navigateToSignIn = () => {
    navigate('/signin');
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
            <p className="mt-1 text-xs text-coffee-500">Numbers and special characters allowed.</p>
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
            <p className="mt-1 text-xs text-coffee-500">You will use this email to sign in.</p>
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
                type={passwordVisible ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-coffee-400 hover:text-coffee-600"
              >
                {passwordVisible ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 text-xs text-coffee-500">Use 8+ characters with a mix of uppercase letters, numbers & symbols for better security.</p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-coffee-500 hover:bg-coffee-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coffee-400"
          >
            Create account
          </button>

          <div className="text-center mt-4">
            <p className="text-sm text-coffee-600">
              Already have an account?{" "}
              <button
                onClick={() => navigate('/signin')} // Redirect to sign in page 
                className="font-medium text-coffee-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;