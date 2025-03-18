/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit3,
  Star,
  Bookmark,
  Plus,
  Check,
  ChevronDown,
  X,
  RefreshCw,
} from 'lucide-react';
import { PREDEFINED_KEYWORDS } from '../../../backend/src/config/keywords';

// EXAMPLES for reviews and collections info
// const recentReviews = [
//   {
//     id: 1,
//     cafeName: 'The Coffee House',
//     rating: 4.5,
//     date: '2 days ago',
//     review:
//       'Amazing atmosphere and even better coffee! The baristas are incredibly knowledgeable and friendly.',
//     image:
//       'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80',
//   },
//   {
//     id: 2,
//     cafeName: 'Brew & Bake',
//     rating: 5,
//     date: '1 week ago',
//     review:
//       'Best croissants in the city! Their coffee selection is outstanding and the ambiance is perfect for both work and casual meetups.',
//     image:
//       'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80',
//   },
// ];

// const collections = [
//   {
//     id: 1,
//     name: 'Favorite Coffee Shops',
//     places: 12,
//     image:
//       'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80',
//   },
//   {
//     id: 2,
//     name: 'Best Study Spots',
//     places: 8,
//     image:
//       'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80',
//   },
//   {
//     id: 3,
//     name: 'Cozy Tea Houses',
//     places: 6,
//     image:
//       'https://images.unsplash.com/photo-1545665225-b23b99e4d45e?auto=format&fit=crop&q=80',
//   },
// ];

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

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/signin');
        return;
      }

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
        } else {
          console.error('Failed to fetch profile:', profileData);
          setError(
            profileData.message || 'Failed to fetch profile. Please try again.'
          );
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
    return <div>Loading...</div>; // Display loading state
  }

  if (error) {
    return <div>{error}</div>; // Display error message if any
  }

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
          <div className="md:w-1/4">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  {/* Default user profile image */}
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png" // Using a default avatar image
                    alt="Default User Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-coffee-100"
                  />
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-coffee-800">
                      {user.firstName} {user.lastName}
                    </h1>
                    <button className="text-coffee-500 hover:text-coffee-600">
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-coffee-600 mb-2">
                    Member since {user.joinedDate}
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
                className={`px-6 py-3 font-medium ${
                  activeTab === 'reviews'
                    ? 'text-coffee-800 border-b-2 border-coffee-500'
                    : 'text-coffee-600 hover:text-coffee-800'
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'collections'
                    ? 'text-coffee-800 border-b-2 border-coffee-500'
                    : 'text-coffee-600 hover:text-coffee-800'
                }`}
              >
                Collections
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
                <div className="fixed bottom-0 left-0 right-0 bg-coffee-50 bg-opacity-90 backdrop-blur-sm py-6 px-8 border-t border-coffee-200">
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
              <div className="space-y-6">
                {user.reviews?.map((review: any) => (
                  <div
                    key={review.id}
                    className="bg-white rounded-xl shadow-sm p-6"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={review.image || 'https://via.placeholder.com/150'}
                        alt={review.cafeName}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-coffee-800">
                              {review.cafeName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? 'text-coffee-400 fill-current'
                                        : 'text-coffee-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-coffee-500 text-sm">
                                {review.date}
                              </span>
                            </div>
                          </div>
                          <button className="text-coffee-400 hover:text-coffee-500">
                            <Bookmark className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="mt-3 text-coffee-600">{review.review}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Collections */}
            {activeTab === 'collections' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.collections?.map((collection: any) => (
                  <div
                    key={collection.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden group cursor-pointer"
                  >
                    <div className="relative h-48">
                      <img
                        src={
                          collection.image ||
                          'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80'
                        }
                        alt={collection.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-4 text-white">
                        <h3 className="text-xl font-semibold mb-1">
                          {collection.name}
                        </h3>
                        <p className="text-sm opacity-90">
                          {collection.places} places
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
