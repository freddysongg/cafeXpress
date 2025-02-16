import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // Assuming you have a login function in your AuthContext

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = { firstName, lastName, username, email, password };

    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        // Assuming the response contains user data and token on successful signup
        const { token, userId } = data.data;
        // Store token and user data in local storage (or in the state using context)
        login(userId, token); // Call the login function from AuthContext to update the global state
        navigate('/'); // Redirect user upon successful signup
      } else {
        // Handle signup failure
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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
                placeholder="Create a password"
              />
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
