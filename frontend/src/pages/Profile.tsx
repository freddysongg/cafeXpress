import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Star, Bookmark, Coffee, Heart, Search, X, Check } from 'lucide-react';

// New user archetype data based on favorites and keyword interests
const userArchetypes = [
  // Archetype for users who favorite at least 10 cafes
  {
    id: 1,
    title: "Cafe Aficionado",
    description: "Your love for cafes is unmatched—you've favorited at least 10 spots!",
    icon: "🌟" // Star icon
  },
  // Combined archetype for ambiance and vibes
  {
    id: 2,
    title: "Ambiance & Vibe Connoisseur",
    description: "You appreciate the perfect setting and mood—whether it's quiet, cozy, study-friendly, or social.",
    icon: "🎶" // Music note icon
  },
  {
    id: 3,
    title: "Dietary Devotee",
    description: "Your unique taste extends to dietary preferences and special menus.",
    icon: "🥗" // Salad icon
  },
  {
    id: 4,
    title: "Feature Fanatic",
    description: "From wifi to live music, you love cafes with standout features.",
    icon: "🎤" // Microphone icon
  },
  {
    id: 5,
    title: "Drink Aficionado",
    description: "Your refined palate seeks everything from tea to craft cocktails.",
    icon: "🍹" // Cocktail icon
  }
];

// Simplified coffee themed profile pictures
const profilePictures = [
  {
    id: 1,
    name: "Coffee Cup",
    url: "https://img.icons8.com/color/96/000000/coffee-cup--v1.png"
  },
  {
    id: 2,
    name: "Coffee Beans",
    url: "https://img.icons8.com/color/96/000000/coffee-beans--v1.png"
  },
  {
    id: 3,
    name: "Cafe Building",
    url: "https://img.icons8.com/color/96/000000/cafe.png"
  }
];

function Profile() {
  const [activeTab, setActiveTab] = useState<'reviews' | 'collections'>('reviews');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userArchetype, setUserArchetype] = useState(null); 
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();
  
  // New states for editing name and avatar
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [showProfilePictureSelector, setShowProfilePictureSelector] = useState(false);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState('https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png');
  
  // Number of skeleton cards to show
  const skeletonCount = 3;

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      
      // if (!token) {
      //   navigate('/signin');
      //   return;
      // }

      try {
        const response = await fetch('http://localhost:8000/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          navigate('/signin');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
          // Initialize editing states with user data
          setEditedFirstName(data.data.firstName);
          setEditedLastName(data.data.lastName);
          if (data.data.profilePicture) {
            setSelectedProfilePicture(data.data.profilePicture);
          }
          
          if (data.data.favorites && data.data.favorites.length >= 5) {
            const randomIndex = Math.floor(Math.random() * userArchetypes.length);
            setUserArchetype(userArchetypes[randomIndex]);
          } else {
            setUserArchetype({
              title: "Discover Your Cafe Personality!",
              description: "Get your Cafe Personality by favoriting 5 cafes!",
              icon: "⭐"
            });
          }
        } else {
          setError('Failed to fetch profile. Please try again.');
        }
      } catch (err) {
        setError('Error fetching profile data.');
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
        collections: []
      };
      setUser(mockUser);
      setEditedFirstName(mockUser.firstName);
      setEditedLastName(mockUser.lastName);
      setLoading(false);
    }
  }, [loading, user]);

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
          <h2 className="text-xl font-semibold text-coffee-800 mb-2">Something went wrong</h2>
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
  
  // Handle name edit start
  const handleEditNameClick = () => {
    setIsEditingName(true);
  };
  
  // Handle name save
  const handleSaveName = async () => {
    // Here you would typically make an API call to update the name
    // For now, we'll just update the local state
    setUser({
      ...user,
      firstName: editedFirstName,
      lastName: editedLastName
    });
    setIsEditingName(false);
    
    // Uncomment to implement actual API call
    // const token = localStorage.getItem('token');
    // try {
    //   const response = await fetch('http://localhost:8000/profile/update', {
    //     method: 'PUT',
    //     headers: {
    //       'Authorization': `Bearer ${token}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ 
    //       firstName: editedFirstName, 
    //       lastName: editedLastName 
    //     }),
    //   });
    //   if (response.ok) {
    //     setUser({
    //       ...user,
    //       firstName: editedFirstName,
    //       lastName: editedLastName
    //     });
    //   }
    // } catch (err) {
    //   console.error('Error updating name:', err);
    // }
    // setIsEditingName(false);
  };
  
  // Handle cancel name edit
  const handleCancelNameEdit = () => {
    setEditedFirstName(user.firstName);
    setEditedLastName(user.lastName);
    setIsEditingName(false);
  };
  
  // Toggle profile picture selector
  const handleProfilePictureClick = () => {
    setShowProfilePictureSelector(!showProfilePictureSelector);
  };
  
  // Select new profile picture
  const handleSelectProfilePicture = async (url) => {
    setSelectedProfilePicture(url);
    setShowProfilePictureSelector(false);
    
    // Here you would typically make an API call to update the profile picture
    // For now, we'll just update the local state
    setUser({
      ...user,
      profilePicture: url
    });
    
    // Uncomment to implement actual API call
    // const token = localStorage.getItem('token');
    // try {
    //   const response = await fetch('http://localhost:8000/profile/update', {
    //     method: 'PUT',
    //     headers: {
    //       'Authorization': `Bearer ${token}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ 
    //       profilePicture: url
    //     }),
    //   });
    // } catch (err) {
    //   console.error('Error updating profile picture:', err);
    // }
  };

  return (
    <div className="min-h-screen bg-coffee-50 pt-20 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Profile Info */}
          <div className="md:w-1/4 space-y-6">
            {/* User Profile Card */}
            <div className="profile-card p-6 border border-coffee-200 animate-scale-in bg-white rounded-lg shadow-sm">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <img
                    src={selectedProfilePicture}
                    alt="User Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-coffee-100 card-animation cursor-pointer"
                    onLoad={handleImageLoad}
                    onClick={handleProfilePictureClick}
                  />
                  {!imageLoaded && (
                    <div className="absolute inset-0 w-32 h-32 rounded-full image-loading"></div>
                  )}
                  <button 
                    className="absolute bottom-0 right-0 bg-coffee-500 text-white p-1 rounded-full hover:bg-coffee-600 transition-colors"
                    onClick={handleProfilePictureClick}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Picture Selector Modal - Simplified with fewer options */}
                {showProfilePictureSelector && (
                  <div className="absolute z-50 inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-coffee-800">Choose Profile Picture</h3>
                        <button 
                          onClick={() => setShowProfilePictureSelector(false)}
                          className="text-coffee-500 hover:text-coffee-700"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="flex justify-center gap-6 mb-4">
                        {profilePictures.map(picture => (
                          <div 
                            key={picture.id} 
                            className={`p-3 border rounded-lg cursor-pointer hover:bg-coffee-50 
                              ${selectedProfilePicture === picture.url ? 'border-coffee-500 bg-coffee-50' : 'border-gray-200'}`}
                            onClick={() => handleSelectProfilePicture(picture.url)}
                          >
                            <div className="flex flex-col items-center">
                              <img 
                                src={picture.url} 
                                alt={picture.name} 
                                className="w-16 h-16 object-contain mb-2" 
                              />
                              <p className="text-xs text-center text-coffee-700">{picture.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button 
                          onClick={() => setShowProfilePictureSelector(false)}
                          className="px-4 py-2 border border-coffee-500 text-coffee-500 rounded-lg mr-2 hover:bg-coffee-50"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => setShowProfilePictureSelector(false)}
                          className="px-4 py-2 bg-coffee-600 text-white rounded-lg hover:bg-coffee-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  {isEditingName ? (
                    <div className="mb-4">
                      <div className="flex flex-col mb-2">
                        {/* Smaller input fields that fit within the card */}
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
                      <h1 className="text-2xl font-bold text-coffee-800">{user.firstName} {user.lastName}</h1>
                      <button 
                        className="text-coffee-500 hover:text-coffee-600 card-animation"
                        onClick={handleEditNameClick}
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <p className="text-coffee-600 mb-2">
                    Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-coffee-500 mb-4">{user.location}</p>

                  <div className="flex justify-center gap-6 border-t border-coffee-100 pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-coffee-800">{user.reviews?.length || 0}</p>
                      <p className="text-coffee-600">Reviews</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-coffee-800">{user.collections?.length || 0}</p>
                      <p className="text-coffee-600">Favorites</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Archetype Card */}
            <div className="profile-card p-6 border border-coffee-200 animate-slide-up min-h-[280px] bg-white rounded-lg shadow-sm" style={{ animationDelay: '0.2s' }}>
              <div className="relative h-full flex flex-col items-center">
                {/* Coffee bean background */}
                <div className="absolute inset-0 opacity-10 bg-coffee-300 bg-opacity-50 rounded-lg" 
                     style={{
                       backgroundImage: "url('https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&q=80')",
                       backgroundSize: "cover",
                       backgroundPosition: "center",
                       backgroundRepeat: "no-repeat",
                       filter: "grayscale(30%)"
                     }}>
                </div>

                {/* Top label */}
                <div className="w-full text-left mb-6 relative z-10">
                  <span className="inline-block bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-coffee-800 text-sm font-medium">
                    Based on your favorites
                  </span>
                </div>
                
                {/* Archetype Icon - With proper spacing */}
                <div className="w-20 h-20 rounded-full bg-coffee-100 flex items-center justify-center relative z-10 mb-8">
                  <span className="text-4xl">{userArchetype.icon}</span>
                </div>
                
                {/* Text content - With improved spacing */}
                <div className="text-center relative z-10 mt-auto pt-2">
                  <h3 className="text-xl font-semibold text-coffee-800 mb-3">You are a: {userArchetype.title}!</h3>
                  <p className="text-sm text-coffee-600">{userArchetype.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:w-3/4">
            {/* Tabs */}
            <div className="flex border-b border-coffee-200 mb-6">
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

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-6 animate-fade-in">
                {user.reviews && user.reviews.length > 0 ? (
                  user.reviews.map((review: any) => (
                    <div key={review.id} className="profile-card p-6 bg-white rounded-lg shadow-sm">
                      <div className="flex items-start gap-4">
                        <img
                          src={review.image || 'https://via.placeholder.com/150'}
                          alt={review.cafeName}
                          className="w-24 h-24 rounded-lg object-cover"
                          onLoad={handleImageLoad}
                        />
                        {!imageLoaded && (
                          <div className="w-24 h-24 rounded-lg image-loading"></div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold text-coffee-800">{review.cafeName}</h3>
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
                                <span className="text-coffee-500 text-sm">{review.date}</span>
                              </div>
                            </div>
                            <button className="text-coffee-400 hover:text-coffee-500 card-animation">
                              <Bookmark className="w-5 h-5" />
                            </button>
                          </div>
                          <p className="mt-3 text-coffee-600">{review.review}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    <div className="empty-state bg-white rounded-lg p-8 mb-8 shadow-sm flex flex-col items-center">
                      <Coffee className="w-12 h-12 mb-4 text-coffee-200" />
                      <h3 className="text-xl font-medium text-coffee-600 mb-2">No reviews yet</h3>
                      <p className="text-coffee-400 mb-6">Go write some reviews!</p>
                      <button 
                        onClick={() => navigate('/explore')} // Redirect to /explore
                        className="px-6 py-2.5 bg-coffee-600 text-white rounded-full hover:bg-coffee-700 transition-colors flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        <span>Find cafes to review</span>
                      </button>
                    </div>
                    
                    {/* Sample text review templates instead of colored bars */}
                    <h4 className="text-lg font-medium text-coffee-600 mb-4">Review Templates</h4>
                    <div className="space-y-4">
                      {[...Array(skeletonCount)].map((_, index) => (
                        <div key={`review-skeleton-${index}`} className="profile-card p-6 bg-white rounded-lg shadow-sm">
                          <div className="flex items-start gap-4">
                            <div className="w-24 h-24 rounded-lg bg-coffee-100 flex items-center justify-center text-coffee-300">
                              <Coffee className="w-12 h-12" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-lg font-semibold text-coffee-800">Cafe Mocha</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-4 h-4 ${i < 4 ? 'text-coffee-400 fill-current' : 'text-coffee-200'}`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-coffee-500 text-sm">March 15, 2025</span>
                                  </div>
                                </div>
                                <Bookmark className="w-5 h-5 text-coffee-200" />
                              </div>
                              <p className="mt-3 text-coffee-600">
                                Great ambiance and even better coffee! The baristas are friendly and knowledgeable. 
                                I especially enjoyed their house blend and the cozy seating area perfect for working or chatting with friends.
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collections/Favorites */}
            {activeTab === 'collections' && (
              <div className="animate-fade-in">
                {user.collections && user.collections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {user.collections.map((collection: any) => (
                      <div key={collection.id} className="profile-card overflow-hidden group cursor-pointer rounded-lg shadow-sm">
                        <div className="relative h-48">
                          <img
                            src={collection.image || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80'}
                            alt={collection.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onLoad={handleImageLoad}
                          />
                          {!imageLoaded && (
                            <div className="absolute inset-0 w-full h-full image-loading"></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-0 left-0 p-4 text-white">
                            <h3 className="text-xl font-semibold mb-1">{collection.name}</h3>
                            <p className="text-sm opacity-90">{collection.places} places</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="empty-state bg-white rounded-lg p-8 mb-8 shadow-sm flex flex-col items-center">
                      <Heart className="w-12 h-12 mb-4 text-coffee-200" />
                      <h3 className="text-xl font-medium text-coffee-600 mb-2">No favorites yet</h3>
                      <p className="text-coffee-400 mb-6">Go favorite some cafes!</p>
                      <button 
                      onClick={() => navigate('/explore')} // Redirect to /explore
                      className="px-6 py-2.5 bg-coffee-600 text-white rounded-full hover:bg-coffee-700 transition-colors flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        <span>Discover cafes</span>
                      </button>
                    </div>
                    
                    {/* Skeleton cards for favorites */}
                    <h4 className="text-lg font-medium text-coffee-600 mb-4">Favorite Templates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[...Array(skeletonCount)].map((_, index) => (
                        <div key={`favorite-skeleton-${index}`} className="profile-card overflow-hidden group rounded-lg shadow-sm bg-white">
                          <div className="relative h-48">
                            <div className="w-full h-full bg-coffee-100"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-4">
                              <div className="h-6 w-32 bg-white/70 rounded-md mb-2"></div>
                              <div className="h-4 w-24 bg-white/50 rounded-md"></div>
                            </div>
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