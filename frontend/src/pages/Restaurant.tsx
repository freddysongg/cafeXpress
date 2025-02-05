import React, { useState } from 'react';
import { Star, Clock, Phone, MapPin, Heart, Share2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

function Restaurant() {
  const { id } = useParams();
  const [isFavorite, setIsFavorite] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(0);

  const restaurant = {
    name: 'The Coffee House',
    rating: 4.5,
    reviews: 128,
    description:
      'A cozy café serving artisanal coffee and fresh pastries in the heart of the city.',
    phone: '(555) 123-4567',
    address: '123 Coffee Street, San Francisco, CA 94110',
    images: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80',
    ],
    vibes: ['Cozy', 'Quiet', 'Modern', 'Artsy', 'Laptop-friendly'],
    dietaryOptions: ['Vegan', 'Gluten-Free', 'Vegetarian'],
    hours: {
      today: '7:00 AM - 8:00 PM',
      weekly: [
        { day: 'Monday', hours: '7:00 AM - 8:00 PM' },
        { day: 'Tuesday', hours: '7:00 AM - 8:00 PM' },
        { day: 'Wednesday', hours: '7:00 AM - 8:00 PM' },
        { day: 'Thursday', hours: '7:00 AM - 8:00 PM' },
        { day: 'Friday', hours: '7:00 AM - 9:00 PM' },
        { day: 'Saturday', hours: '8:00 AM - 9:00 PM' },
        { day: 'Sunday', hours: '8:00 AM - 7:00 PM' },
      ],
    },
    location: {
      lat: 37.7749,
      lng: -122.4194,
    },
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement review submission
    setNewReview('');
    setRating(0);
  };

  return (
    <div className="min-h-screen bg-coffee-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-coffee-800 mb-2">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="w-5 h-5 text-coffee-400 fill-current" />
                <span className="ml-1 font-semibold">{restaurant.rating}</span>
                <span className="text-coffee-500 ml-1">
                  ({restaurant.reviews} reviews)
                </span>
              </div>
              <span className="text-coffee-400">•</span>
              <span className="text-coffee-600">{restaurant.hours.today}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-full ${
                isFavorite
                  ? 'bg-coffee-100 text-coffee-600'
                  : 'bg-white text-coffee-400'
              } hover:bg-coffee-100 transition-colors`}
            >
              <Heart
                className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`}
              />
            </button>
            <button className="p-2 rounded-full bg-white text-coffee-400 hover:bg-coffee-100 transition-colors">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {restaurant.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`${restaurant.name} ${index + 1}`}
              className="w-full h-64 object-cover rounded-xl"
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                About
              </h2>
              <p className="text-coffee-600">{restaurant.description}</p>
            </div>

            {/* Vibes & Dietary Options */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                Vibes
              </h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {restaurant.vibes.map((vibe, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-coffee-50 text-coffee-600 rounded-full text-sm"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                Dietary Options
              </h2>
              <div className="flex flex-wrap gap-2">
                {restaurant.dietaryOptions.map((option, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-coffee-50 text-coffee-600 rounded-full text-sm"
                  >
                    {option}
                  </span>
                ))}
              </div>
            </div>

            {/* Review Form */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                Write a Review
              </h2>
              <form onSubmit={handleSubmitReview}>
                <div className="flex items-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'text-coffee-400 fill-current'
                            : 'text-coffee-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full p-4 border border-coffee-200 rounded-lg focus:ring-2 focus:ring-coffee-400 focus:border-transparent min-h-[120px]"
                />
                <button
                  type="submit"
                  className="mt-4 px-6 py-2 bg-coffee-500 text-white rounded-lg hover:bg-coffee-600 transition-colors"
                >
                  Post Review
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact & Location */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="w-5 h-5 text-coffee-500" />
                <span className="text-coffee-600">{restaurant.phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-coffee-500 mt-1" />
                <span className="text-coffee-600">{restaurant.address}</span>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-coffee-800 mb-4">Hours</h3>
              <div className="space-y-2">
                {restaurant.hours.weekly.map((day, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-coffee-600">{day.day}</span>
                    <span className="text-coffee-800">{day.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-64 bg-coffee-100 rounded-lg">
                {/* TODO: Implement Google Maps integration */}
                <div className="w-full h-full flex items-center justify-center text-coffee-500">
                  Map placeholder
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Restaurant;
