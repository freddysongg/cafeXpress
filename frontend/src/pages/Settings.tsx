import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';

function Settings() {
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

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
  
    if (!confirmDelete) return;
  
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
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // Ensure token is sent for authentication
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }
  
      alert('Account deleted successfully.');
      localStorage.removeItem('token'); // Remove the token after account deletion
      window.location.href = '/login'; // Redirect to login page
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    }
  };
  

  return (
    <div className="min-h-screen bg-coffee-50 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-coffee-800 mb-8">Settings</h1>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
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
          {/* Delete Account Button */}
          <div className="mt-6">
            <h2 className="text-medium font-semibold text-red-800 mb-4">Delete Account</h2>
            <button
              onClick={handleDeleteAccount}
              className="w-full px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
