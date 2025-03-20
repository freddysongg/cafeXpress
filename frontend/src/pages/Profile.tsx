/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Edit3,
  Star,
  Bookmark,
  Plus,
  ChevronDown,
  Coffee,
  Heart,
  Search,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';
import { PREDEFINED_KEYWORDS } from '../../../backend/src/config/keywords';
import { CafeReview } from '../services/api';

type UserArchetype = {
  id: number;
  title: string;
  description: string;
  icon: string;
};

// New user archetype data based on favorites and keyword interests
const userArchetypes: UserArchetype[] = [
  {
    id: 0,
    title: 'Regular Cafe Enjoyer',
    description:
      "A coffee enthusiast who thrives in the cozy ambiance of cafes, savoring every sip of espresso while working, reading, or simply people-watching.",
    icon: '☕',
  },
  {
    id: 1,
    title: 'Ultimate Cafe Enthusiast',
    description:
      "You're a true cafe connoisseur! With so many favorites, you've truly mastered the art of cafe exploration.",
    icon: '🌟',
  },
  {
    id: 2,
    title: 'Ambiance Appreciator',
    description:
      "You have a keen eye for atmosphere—whether it's quiet or cozy.",
    icon: '✨',
  },
  {
    id: 3,
    title: 'Vibe Seeker',
    description:
      "You're drawn to the perfect cafe energy, ranging from social to casual.",
    icon: '🎵',
  },
  {
    id: 4,
    title: 'Dietary Explorer',
    description:
      'You value inclusive menus with multiple options such as vegan or dairy free.',
    icon: '🥗',
  },
];

// Updated profile picture options: now more cafe themed
const profilePictures = [
  { id: 1, name: 'Coffee Cup', icon: '☕' },
  { id: 2, name: 'Croissant', icon: '🥐' },
  { id: 3, name: 'Donut', icon: '🍩' },
];

type PreferenceCategory =
  | 'dietary'
  | 'ambiance'
  | 'activities'
  | 'drinks'
  | 'vibes'
  | 'coffee';

function Profile() {
  const [activeTab, setActiveTab] = useState<
    'preferences' | 'reviews' | 'collections'
  >('preferences');
  const [user, setUser] = useState<any>(null);
  const [cafes, setCafes] = useState<{ [cafeId: string]: CafeReview }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<{
    dietary: string[];
    ambiance: string[];
    activities: string[];
    drinks: string[];
    vibes: string[];
    coffee: string[];
  }>({
    dietary: [],
    ambiance: [],
    activities: [],
    drinks: [],
    vibes: [],
    coffee: [],
  });
  const [userArchetype, setUserArchetype] = useState<UserArchetype | null>(
    null
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();
  const [showSelectedSummary, setShowSelectedSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] =
    useState<PreferenceCategory | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // New states for editing name and avatar
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [showProfilePictureSelector, setShowProfilePictureSelector] =
    useState(false);
  // Default profile picture now set to an emoji placeholder
  const [selectedProfilePicture, setSelectedProfilePicture] = useState('👤');

  // Number of skeleton cards to show
  const skeletonCount = 3;

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/signin');
        return;
      }
      const decoded = jwtDecode<DecodedToken>(token);
      const userId = decoded.id; // Assuming `id` is the field where `userId` is stored
      if (!userId) return;

      try {
        const [profileResponse, preferencesResponse] = await Promise.all([
          fetch('http://localhost:8000/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('http://localhost:8000/preference/current', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (
          profileResponse.status === 401 ||
          preferencesResponse.status === 401
        ) {
          navigate('/signin');
          return;
        }

        const profileData = await profileResponse.json();
        const preferencesData = await preferencesResponse.json();

        if (profileResponse.ok && profileData.status === 'success') {
          setUser(profileData.data);
          setEditedFirstName(profileData.data.firstName);
          setEditedLastName(profileData.data.lastName);
          if (profileData.data.profilePicture) {
            setSelectedProfilePicture(profileData.data.profilePicture);
          }

          // Fetch the user's archetype based on their favorite cafes
          const archetypeResponse = await fetch(
            `http://localhost:8000/gammification/${userId}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (archetypeResponse.ok) {
            const archetypeData = await archetypeResponse.json();
            const idType = archetypeData.idType; // e.g., 'id0', 'id1', 'id2', etc.

            console.log('Backend Response - idType:', idType); // Debugging log

            // Map the idType to a user archetype
            const archetype = userArchetypes.find(
              (archetype) => archetype.id === parseInt(idType.replace('id', ''))
            );

            console.log('Mapped Archetype:', archetype); // Debugging log

            if (archetype) {
              setUserArchetype(archetype);
            } else {
              setUserArchetype(userArchetypes[0]); // Default archetype
            }
          } else {
            console.error('Failed to fetch archetype:', archetypeResponse);
            setUserArchetype(userArchetypes[0]); // Default archetype
          }
        } else {
          console.error('Failed to fetch profile:', profileData);
          setError(profileData.message || 'Failed to fetch profile. Please try again.');
        }

        if (preferencesResponse.ok && preferencesData.status === 'success') {
          const defaultPreferences = {
            dietary: [],
            ambiance: [],
            activities: [],
            drinks: [],
            vibes: [],
            coffee: [],
          };

          // If data is null or undefined, use default preferences
          const userPreferences = preferencesData.data || defaultPreferences;

          // Ensure all preference categories exist
          setPreferences({
            dietary: userPreferences.dietary || [],
            ambiance: userPreferences.ambiance || [],
            activities: userPreferences.activities || [],
            drinks: userPreferences.drinks || [],
            vibes: userPreferences.vibes || [],
            coffee: userPreferences.coffee || [],
          });
        } else {
          console.error('Failed to fetch preferences:', preferencesData);
          // Don't set error for preferences, just use default empty arrays
          setPreferences({
            dietary: [],
            ambiance: [],
            activities: [],
            drinks: [],
            vibes: [],
            coffee: [],
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setError('Error fetching profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // Mock user data for development
  useEffect(() => {
    if (!user && !loading) {
      const mockUser = {
        firstName: 'Jane',
        lastName: 'Doe',
        createdAt: new Date().toISOString(),
        location: 'San Francisco, CA',
        reviews: [],
        collections: [],
      };
      setUser(mockUser);
      setEditedFirstName(mockUser.firstName);
      setEditedLastName(mockUser.lastName);
      setLoading(false);
    }
  }, [loading, user]);

  const fetchCafeDetails = async (cafeId: string) => {
    try {
      setLoading(true);
      const url = `http://localhost:8000/cafe/${cafeId}`;
      const response = await fetch(url, {
        method: 'GET', // Explicitly using GET request
      });
      const data = await response.json();
      setCafes((prevCafes) => ({ ...prevCafes, [cafeId]: data as CafeReview })); // Store fetched cafe by cafeId
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch cafe details.');
      setLoading(false);
    }
  };
  
  interface Review {
    id: string;
    cafeId: string;
    rating: number;
    date: string;
    description: string;
    createdAt: string;
  }
  
  useEffect(() => {
    if (user?.reviews && user.reviews.length > 0) {
      user.reviews.forEach((review: Review) => {
        if (!cafes[review.cafeId]) {
          // Avoid duplicate fetching
          fetchCafeDetails(review.cafeId);
        }
      });
    }
  
    if (user?.collections && user.collections.length > 0) {
      user.collections.forEach((collection: any) => {
        if (!cafes[collection.cafeId]) {
          // Avoid duplicate fetching
          fetchCafeDetails(collection.cafeId); // Fetch cafe details for collections as well
        }
      });
    }

    console.log('Cafes: ', cafes)
  }, [user, cafes]);
  

  const handlePreferenceToggle = (
    category: PreferenceCategory,
    value: string
  ) => {
    setPreferences((prev) => {
      const currentPrefs = prev[category];
      const newPrefs = currentPrefs.includes(value)
        ? currentPrefs.filter((p) => p !== value)
        : [...currentPrefs, value];

      return {
        ...prev,
        [category]: newPrefs,
      };
    });
  };

  const getTotalSelectedPreferences = () => {
    return Object.values(preferences).reduce(
      (total, prefs) => total + prefs.length,
      0
    );
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/preference/current', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        // Reset UI state
        setExpandedCategory(null);
        setSearchTerm('');
        setShowSelectedSummary(true);

        // Show success notification
        setNotification({
          show: true,
          message: 'Preferences saved successfully',
          type: 'success',
        });

        // Fetch updated preferences
        const updatedResponse = await fetch(
          'http://localhost:8000/preference/current',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          if (data.status === 'success' && data.data) {
            setPreferences({
              dietary: data.data.dietary || [],
              ambiance: data.data.ambiance || [],
              activities: data.data.activities || [],
              drinks: data.data.drinks || [],
              vibes: data.data.vibes || [],
              coffee: data.data.coffee || [],
            });
          }
        }

        // Hide notification after 2 seconds
        setTimeout(() => {
          setNotification((prev) => ({ ...prev, show: false }));
        }, 2000);
      } else {
        setNotification({
          show: true,
          message: 'Failed to save preferences',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setNotification({
        show: true,
        message: 'Failed to save preferences',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter preferences based on search term
  const filterPreferences = (options: string[]) => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get category description
  const getCategoryDescription = (category: PreferenceCategory) => {
    switch (category) {
      case 'dietary':
        return 'Select your dietary preferences to find cafes that cater to your needs';
      case 'ambiance':
        return 'Choose your preferred atmosphere and environment';
      case 'activities':
        return 'What do you like to do at cafes?';
      case 'drinks':
        return 'Select your favorite types of drinks';
      case 'vibes':
        return 'What kind of mood are you looking for?';
      case 'coffee':
        return 'Choose your preferred coffee styles and preparations';
      default:
        return '';
    }
  };

  const renderPreferenceSection = (
    title: string,
    category: PreferenceCategory,
    options: string[],
    bgColor: string,
    textColor: string
  ) => {
    const selectedCount = preferences[category].length;
    const totalCount = options.length;

    return (
      <div
        data-preference-section
        className={`bg-white rounded-xl shadow-sm p-6 transition-all duration-300 ${
          selectedCount > 0 ? 'ring-2 ring-coffee-100' : ''
        }`}
      >
        <div
          className="flex justify-between items-center mb-4 cursor-pointer"
          onClick={() =>
            setExpandedCategory(expandedCategory === category ? null : category)
          }
        >
          <div>
            <h3 className="text-lg font-semibold text-coffee-800">{title}</h3>
            <p className="text-sm text-coffee-600 mt-1">
              {getCategoryDescription(category)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm ${selectedCount > 0 ? 'text-coffee-800 font-medium' : 'text-coffee-600'}`}
            >
              {selectedCount} of {totalCount} selected
            </span>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-300 ${
                expandedCategory === category ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {expandedCategory === category && (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search preferences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-coffee-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filterPreferences(options).map((option) => {
                const isSelected = preferences[category].includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => handlePreferenceToggle(category, option)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                      isSelected
                        ? `${bgColor} ${textColor} shadow-md`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-1">
                        {option}
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        {option}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-coffee-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-32 h-32 bg-coffee-200 rounded-full mb-4"></div>
          <div className="h-6 w-48 bg-coffee-200 rounded mb-2"></div>
          <div className="h-4 w-32 bg-coffee-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-coffee-50">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md">
          <h2 className="text-xl font-semibold text-coffee-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-coffee-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-coffee-600 text-white rounded-lg hover:bg-coffee-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleEditNameClick = () => {
    setIsEditingName(true);
  };

  interface DecodedToken {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }

  const handleSaveName = async () => {
    try {
      // Make a request to the backend API
      const token = localStorage.getItem('token');
      const decoded = jwtDecode<DecodedToken>(token!);
      const userId = decoded.id;
      if (!token) {
        navigate('/signin');
        return;
      }
      const response = await fetch(`http://localhost:8000/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: editedFirstName,
          lastName: editedLastName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Update the user state with the new data
        setUser({
          ...user,
          firstName: editedFirstName,
          lastName: editedLastName,
        });
        setIsEditingName(false);
        console.log('User updated successfully:', data.data);
      } else {
        console.error('Error updating user:', data.message);
      }
    } catch (error) {
      console.error('Error making the request:', error);
    }
  };

  const handleCancelNameEdit = () => {
    setEditedFirstName(user.firstName);
    setEditedLastName(user.lastName);
    setIsEditingName(false);
  };

  // const handleProfilePictureClick = () => {
  //   setShowProfilePictureSelector(!showProfilePictureSelector);
  // };

  // When selecting a new profile icon, update immediately and close modal
  const handleSelectProfilePicture = (icon: string) => {
    setSelectedProfilePicture(icon);
    setShowProfilePictureSelector(false);
    setUser({
      ...user,
      profilePicture: icon,
    });
  };

  return (
    <div className="min-h-screen bg-coffee-50 pt-20 pb-32">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div
            className={`rounded-lg shadow-lg p-4 ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <Check className={`h-5 w-5 text-green-400`} />
                ) : (
                  <X className={`h-5 w-5 text-red-400`} />
                )}
              </div>
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    notification.type === 'success'
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}
                >
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={() =>
                    setNotification((prev) => ({ ...prev, show: false }))
                  }
                  className={`rounded-md inline-flex text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notification.type === 'success'
                      ? 'text-green-600 hover:text-green-500 focus:ring-green-500'
                      : 'text-red-600 hover:text-red-500 focus:ring-red-500'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Profile Info */}
          <div className="md:w-1/4 space-y-6">
            {/* User Profile Card */}
            <div className="profile-card p-6 border border-coffee-200 animate-scale-in bg-white rounded-lg shadow-sm">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png" // Using a default avatar image
                    alt="Default User Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-coffee-100"
                  />
                </div>

                {/* Profile Picture Selector Modal */}
                {showProfilePictureSelector && (
                  <div className="absolute z-50 inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-coffee-800">
                          Choose Profile Icon
                        </h3>
                        <button
                          onClick={() => setShowProfilePictureSelector(false)}
                          className="text-coffee-500 hover:text-coffee-700"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="flex justify-center gap-4 mb-4">
                        {profilePictures.map((picture) => (
                          <div
                            key={picture.id}
                            className={`w-24 h-24 flex flex-col items-center justify-center border rounded-lg cursor-pointer hover:bg-coffee-50 
                              ${selectedProfilePicture === picture.icon ? 'border-coffee-500 bg-coffee-50' : 'border-gray-200'}`}
                            onClick={() =>
                              handleSelectProfilePicture(picture.icon)
                            }
                          >
                            <span className="text-4xl mb-2">
                              {picture.icon}
                            </span>
                            <p className="text-xs text-center text-coffee-700">
                              {picture.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* User Info */}
                <div className="text-center">
                  {isEditingName ? (
                    <div className="mb-4">
                      <div className="flex flex-col mb-2">
                        <div className="flex space-x-1 mb-2">
                          <input
                            type="text"
                            value={editedFirstName}
                            onChange={(e) => setEditedFirstName(e.target.value)}
                            className="w-24 px-2 py-1 border border-coffee-300 rounded-lg text-coffee-800 text-center text-sm"
                            placeholder="First Name"
                          />
                          <input
                            type="text"
                            value={editedLastName}
                            onChange={(e) => setEditedLastName(e.target.value)}
                            className="w-24 px-2 py-1 border border-coffee-300 rounded-lg text-coffee-800 text-center text-sm"
                            placeholder="Last Name"
                          />
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={handleCancelNameEdit}
                            className="p-1 mr-2 text-coffee-500 hover:text-coffee-700"
                            title="Cancel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleSaveName}
                            className="p-1 text-coffee-500 hover:text-coffee-700"
                            title="Save"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h1 className="text-2xl font-bold text-coffee-800">
                        {user.firstName} {user.lastName}
                      </h1>
                      <button
                        className="text-coffee-500 hover:text-coffee-600 card-animation"
                        onClick={handleEditNameClick}
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <p className="text-coffee-600 mb-2">
                    Member since{' '}
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-coffee-500 mb-4">{user.location}</p>
                  <div className="flex justify-center gap-6 border-t border-coffee-100 pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-coffee-800">
                        {user.reviews?.length || 0}
                      </p>
                      <p className="text-coffee-600">Reviews</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-coffee-800">
                        {user.collections?.length || 0}
                      </p>
                      <p className="text-coffee-600">Collections</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Archetype Card */}
            <div
              className="profile-card p-6 border border-coffee-200 animate-slide-up min-h-[280px] bg-white rounded-lg shadow-sm"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="relative h-full flex flex-col items-center">
                <div
                  className="absolute inset-0 opacity-10 bg-coffee-300 bg-opacity-50 rounded-lg"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&q=80')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'grayscale(30%)',
                  }}
                ></div>

                <div className="w-full text-left mb-6 relative z-10">
                  <span className="inline-block bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-coffee-800 text-sm font-medium">
                    Based on your favorites
                  </span>
                </div>

                <div className="w-20 h-20 rounded-full bg-coffee-100 flex items-center justify-center relative z-10 mb-8">
                  <span className="text-4xl">{userArchetype?.icon}</span>
                </div>

                <div className="text-center relative z-10 mt-auto pt-2">
                  <h3 className="text-xl font-semibold text-coffee-800 mb-3">
                    You are a: {userArchetype?.title}!
                  </h3>
                  <p className="text-sm text-coffee-600">
                    {userArchetype?.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:w-3/4">
            {/* Tabs */}
            <div className="flex border-b border-coffee-200 mb-6">
              <button
                onClick={() => setActiveTab('preferences')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'preferences'
                    ? 'text-coffee-800 border-b-2 border-coffee-500'
                    : 'text-coffee-600 hover:text-coffee-800'
                }`}
              >
                Preferences
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-3 font-medium tab-transition ${
                  activeTab === 'reviews'
                    ? 'text-coffee-800 border-b-2 border-coffee-500'
                    : 'text-coffee-600 hover:text-coffee-800'
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`px-6 py-3 font-medium tab-transition ${
                  activeTab === 'collections'
                    ? 'text-coffee-800 border-b-2 border-coffee-500'
                    : 'text-coffee-600 hover:text-coffee-800'
                }`}
              >
                Favorites
              </button>
            </div>

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-8 relative pb-20">
                {/* Selected Preferences Summary */}
                {showSelectedSummary && getTotalSelectedPreferences() > 0 && (
                  <div className="bg-coffee-100 rounded-xl p-6 mb-8 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-coffee-800">
                          Your Selected Preferences
                        </h3>
                        <p className="text-sm text-coffee-600 mt-1">
                          {getTotalSelectedPreferences()} preferences selected
                          across{' '}
                          {
                            Object.entries(preferences).filter(
                              ([, values]) => values.length > 0
                            ).length
                          }{' '}
                          categories
                        </p>
                      </div>
                      <button
                        onClick={() => setShowSelectedSummary(false)}
                        className="text-coffee-600 hover:text-coffee-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(preferences).map(
                        ([category, values]) =>
                          values.length > 0 && (
                            <div
                              key={category}
                              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-coffee-700 capitalize">
                                  {category}
                                </h4>
                                <span className="text-xs text-coffee-500">
                                  {values.length} selected
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {values.map((value) => (
                                  <span
                                    key={value}
                                    className="text-xs bg-coffee-50 text-coffee-600 px-2 py-1 rounded-full flex items-center gap-1 group cursor-pointer hover:bg-coffee-200 hover:text-coffee-800 transition-colors duration-200"
                                    title={`Click to remove ${value}`}
                                    onClick={() =>
                                      handlePreferenceToggle(
                                        category as PreferenceCategory,
                                        value
                                      )
                                    }
                                  >
                                    {value}
                                    <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                      )}
                    </div>
                  </div>
                )}

                {/* Preference Sections */}
                {renderPreferenceSection(
                  'Dietary Preferences',
                  'dietary',
                  PREDEFINED_KEYWORDS.dietary,
                  'bg-emerald-100',
                  'text-emerald-800'
                )}
                {renderPreferenceSection(
                  'Ambiance Preferences',
                  'ambiance',
                  PREDEFINED_KEYWORDS.ambiance,
                  'bg-violet-100',
                  'text-violet-800'
                )}
                {renderPreferenceSection(
                  'Activity Preferences',
                  'activities',
                  PREDEFINED_KEYWORDS.features,
                  'bg-amber-100',
                  'text-amber-800'
                )}
                {renderPreferenceSection(
                  'Drinks',
                  'drinks',
                  PREDEFINED_KEYWORDS.drinks,
                  'bg-teal-100',
                  'text-teal-800'
                )}
                {renderPreferenceSection(
                  'Vibes',
                  'vibes',
                  PREDEFINED_KEYWORDS.vibes,
                  'bg-pink-100',
                  'text-pink-800'
                )}
                {renderPreferenceSection(
                  'Coffee',
                  'coffee',
                  PREDEFINED_KEYWORDS.coffee,
                  'bg-brown-100',
                  'text-brown-800'
                )}

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 bg-coffee-50 bg-opacity-90 backdrop-blur-sm py-6 px-8 border-t border-coffee-200 z-50">
                  <div className="max-w-7xl mx-auto flex justify-end">
                    <button
                      onClick={savePreferences}
                      disabled={saving}
                      className={`px-6 py-2 bg-coffee-600 text-white rounded-lg hover:bg-coffee-700 transition-all duration-200 flex items-center gap-2 ${
                        saving
                          ? 'opacity-75 cursor-not-allowed'
                          : 'hover:scale-105'
                      }`}
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Preferences
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-6 animate-fade-in">
                {user?.reviews && user.reviews.length > 0 ? (
                  user.reviews.map((review: Review) => {
                    const cafeDetails = cafes[review.cafeId] as CafeReview; // Retrieve cafe details from state

                    if (!cafeDetails) {
                      // In case cafeDetails is not available yet, you can show a loading state or fallback message
                      return <div key={review.id}>Loading cafe details...</div>;
                    }

                    // Safely access the first photo with a fallback
                    const photoUrl =
                      cafeDetails.data.photos?.[0] ||
                      'https://picsum.photos/400/300';

                    return (
                      <div
                        key={review.id}
                        className="profile-card p-6 bg-white rounded-lg shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={photoUrl}
                            alt={cafeDetails.data.name || 'Cafe Image'}
                            className="w-24 h-24 rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://picsum.photos/400/300'; // Fallback image
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-coffee-800">
                                  {cafeDetails.data.name}
                                </h3>{' '}
                                {/* Cafe name */}
                              </div>
                              <span className="text-sm text-coffee-600">
                                {new Date(
                                  review.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < review.rating ? 'text-coffee-400 fill-current' : 'text-coffee-200'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="mt-3 text-coffee-600">
                              {review.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div>
                    <div className="empty-state bg-white rounded-lg p-8 mb-8 shadow-sm flex flex-col items-center">
                      <Coffee className="w-12 h-12 mb-4 text-coffee-200" />
                      <h3 className="text-xl font-medium text-coffee-600 mb-2">
                        No reviews yet
                      </h3>
                      <p className="text-coffee-400 mb-6">
                        Go write some reviews!
                      </p>
                      <button
                        onClick={() => navigate('/explore')}
                        className="px-6 py-2.5 bg-coffee-600 text-white rounded-full hover:bg-coffee-700 transition-colors flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        <span>Find cafes to review</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collections/Favorites */}
            {activeTab === 'collections' && (
              <div className="animate-fade-in">
                  {user ? (
                    console.log("User object:", user) // Log the user object to check if it's populated
                  ) : null}
                 {user?.collections ? (
                    console.log("User collections:", user.collections) // Check if collections exist
                  ) : null}
                {user?.collections && user.collections.length > 0 ? (
                  user.collections.map((collection: any) => {
                    console.log('Id: ', collection.cafeId);
                    console.log('cafes: ', cafes);
                    const cafeDetails = cafes[collection.cafeId]; // Retrieve cafe details from state

                    if (!cafeDetails) {
                      // In case cafeDetails is not available yet, you can show a loading state or fallback message
                      return <div key={collection.id}>Loading cafe details...</div>;
                    }

                    // Safely access the first photo with a fallback
                    const photoUrl =
                      cafeDetails.data.photos?.[0] ||
                      'https://picsum.photos/400/300'; // Fallback image

                    return (
                      <div
                        key={collection.id}
                        className="profile-card overflow-hidden group cursor-pointer rounded-lg shadow-sm"
                      >
                        <div className="relative h-48">
                          <img
                            src={photoUrl}
                            alt={cafeDetails.data.name || 'Cafe Image'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-0 left-0 p-4 text-white">
                            <h3 className="text-xl font-semibold mb-1">
                              {cafeDetails.data.name} {/* Cafe title */}
                            </h3>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div>
                    <div className="empty-state bg-white rounded-lg p-8 mb-8 shadow-sm flex flex-col items-center">
                      <Heart className="w-12 h-12 mb-4 text-coffee-200" />
                      <h3 className="text-xl font-medium text-coffee-600 mb-2">
                        No favorites yet
                      </h3>
                      <p className="text-coffee-400 mb-6">
                        Go favorite some cafes!
                      </p>
                      <button
                        onClick={() => navigate('/explore')}
                        className="px-6 py-2.5 bg-coffee-600 text-white rounded-full hover:bg-coffee-700 transition-colors flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        <span>Discover cafes</span>
                      </button>
                    </div>

                    {/* Favorite Templates with simplified layout */}
                    <h4 className="text-lg font-medium text-coffee-600 mb-4">
                      Favorite Templates
                    </h4>
                    <div className="space-y-4">
                      {[...Array(skeletonCount)].map((_, index) => (
                        <div
                          key={`favorite-skeleton-${index}`}
                          className="profile-card bg-white rounded-lg shadow-sm p-4 flex items-center gap-4"
                        >
                          <div className="w-20 h-20 rounded-lg bg-coffee-100 overflow-hidden">
                            <img
                              src="https://via.placeholder.com/80"
                              alt="Cafe Sample"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-coffee-800">
                              Cafe Name
                            </h3>
                            <p className="text-coffee-600">
                              Desription of cafe / Main keywords.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
