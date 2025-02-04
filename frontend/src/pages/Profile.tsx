import { useState } from 'react';
import { User, Edit3, Camera, Star, Bookmark } from 'lucide-react';

function Profile() {
  const [activeTab, setActiveTab] = useState<'reviews' | 'collections'>('reviews');

  const user = {
    name: 'Sarah Johnson',
    location: 'San Francisco, CA',
    joinedDate: 'January 2024',
    reviews: 42,
    collections: 15,
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80'
  };

  const recentReviews = [
    {
      id: 1,
      cafeName: "The Coffee House",
      rating: 4.5,
      date: "2 days ago",
      review: "Amazing atmosphere and even better coffee! The baristas are incredibly knowledgeable and friendly.",
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80"
    },
    {
      id: 2,
      cafeName: "Brew & Bake",
      rating: 5,
      date: "1 week ago",
      review: "Best croissants in the city! Their coffee selection is outstanding and the ambiance is perfect for both work and casual meetups.",
      image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80"
    }
  ];

  const collections = [
    {
      id: 1,
      name: "Favorite Coffee Shops",
      places: 12,
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80"
    },
    {
      id: 2,
      name: "Best Study Spots",
      places: 8,
      image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80"
    },
    {
      id: 3,
      name: "Cozy Tea Houses",
      places: 6,
      image: "https://images.unsplash.com/photo-1545665225-b23b99e4d45e?auto=format&fit=crop&q=80"
    }
  ];

  return (
    <div className="min-h-screen bg-coffee-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar - Profile Info */}
          <div className="md:w-1/4">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-coffee-100"
                  />
                  <button className="absolute bottom-0 right-0 bg-coffee-500 text-white p-2 rounded-full hover:bg-coffee-600 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-coffee-800">{user.name}</h1>
                    <button className="text-coffee-500 hover:text-coffee-600">
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-coffee-600 mb-2">Member since {user.joinedDate}</p>
                  <p className="text-coffee-500 mb-4">{user.location}</p>
                  
                  <div className="flex justify-center gap-6 border-t border-coffee-100 pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-coffee-800">{user.reviews}</p>
                      <p className="text-coffee-600">Reviews</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-coffee-800">{user.collections}</p>
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

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {recentReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={review.image}
                        alt={review.cafeName}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
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
                {collections.map(collection => (
                  <div key={collection.id} className="bg-white rounded-xl shadow-sm overflow-hidden group cursor-pointer">
                    <div className="relative h-48">
                      <img
                        src={collection.image}
                        alt={collection.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-4 text-white">
                        <h3 className="text-xl font-semibold mb-1">{collection.name}</h3>
                        <p className="text-sm opacity-90">{collection.places} places</p>
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