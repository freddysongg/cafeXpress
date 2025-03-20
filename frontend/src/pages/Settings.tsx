import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

function Settings() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID from token on component mount
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode<{ id: string }>(token);
      setUserId(decoded.id); // Set the user ID from the token
    } else {
      console.error('User not logged in');
    }
  }, []);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      console.error('User ID is missing');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('User not logged in');
        return;
      }

      const response = await fetch(`http://localhost:8000/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }), // Send only the new email
      });

      if (!response.ok) {
        throw new Error('Failed to update email');
      }

      alert('Email updated successfully!');
      setEmail(''); // Clear the email input field
    } catch (error) {
      console.error('Error updating email:', error);
      alert('Failed to update email. Please try again.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      console.error('User ID is missing');
      return;
    }

    if (!currentPassword || !newPassword) {
      alert('Please fill in both current and new passwords.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('User not logged in');
        return;
      }

      // Send both current and new passwords to the backend
      const response = await fetch(
        `http://localhost:8000/auth/updatePassword/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update password');
      }

      alert('Password updated successfully!');
      setCurrentPassword(''); // Clear the current password field
      setNewPassword(''); // Clear the new password field
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Current password incorrect');
    }
  };

  return (
    <div className="min-h-screen bg-coffee-50 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-coffee-800 mb-8">Settings</h1>

        {/* Theme Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-coffee-800 mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-coffee-600">Theme</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-coffee-100 hover:bg-coffee-200 transition-colors"
            >
              {isDarkMode ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              <span>{isDarkMode ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-coffee-800 mb-4">
            Account Settings
          </h2>

          {/* Email Update */}
          <form onSubmit={handleUpdateEmail} className="mb-6">
            <label className="block text-sm font-medium text-coffee-700 mb-2">
              Email Address
            </label>
            <div className="flex gap-4">
              <input
                type="email"
                placeholder="New email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-coffee-500 text-white rounded-lg hover:bg-coffee-600 transition-colors"
              >
                Update Email
              </button>
            </div>
          </form>

          {/* Password Update */}
          <form onSubmit={handleUpdatePassword}>
            <label className="block text-sm font-medium text-coffee-700 mb-2">
              Change Password
            </label>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent"
              />
              <button
                type="submit"
                className="w-full px-6 py-2 bg-coffee-500 text-white rounded-lg hover:bg-coffee-600 transition-colors"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-coffee-800 mb-4">
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-coffee-600">Enable Notifications</span>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications ? 'bg-coffee-500' : 'bg-coffee-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
