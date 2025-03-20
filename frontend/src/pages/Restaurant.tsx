import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  Phone,
  MapPin,
  Heart,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCafe } from '../hooks/useCafe';
import { KeywordMatch } from '../services/api';
import { jwtDecode } from 'jwt-decode';
import GoogleMapComponent from '../components/GoogleMapComponent'; // Adjust path if needed

interface Review {
  id: string;
  userId: string;
  cafeId: string;
  rating: number;
  description: string;
  title: string;
  createdAt: Date;
  firstName?: string;
  lastName?: string;
}

interface DecodedToken {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

function Restaurant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cafe, loading, error } = useCafe(id);
  const [isFavorite, setIsFavorite] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [cafe]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`http://localhost:8000/review/${id}/all`);
        const textResponse = await res.text(); // Get the response as text

        // Check if the response contains JSON
        if (res.ok) {
          const reviewsData = JSON.parse(textResponse); // Parse it as JSON

          // Process user details
          const reviewsWithUserDetails = await Promise.all(
            reviewsData.data.map(async (review: Review) => {
              // Access 'data' property which contains reviews
              try {
                const userRes = await fetch(
                  `http://localhost:8000/user/${review.userId}`
                );
                const userData = await userRes.json();

                if (
                  userData.status === 'success' &&
                  userData.data &&
                  userData.data.length > 0
                ) {
                  const user = userData.data[0]; // Assuming that data contains an array and you want the first element
                  return {
                    ...review,
                    firstName: user.firstName,
                    lastName: user.lastName,
                  };
                } else {
                  return review; // If no user data is found or status is not success
                }
              } catch (err) {
                console.error('Error fetching user data:', err);
                return review;
              }
            })
          );

          // Now set the state with reviews with user details
          if (
            reviewsData.status === 'success' &&
            Array.isArray(reviewsData.data)
          ) {
            setReviews(reviewsWithUserDetails); // Update your state with the reviews with user details
          } else {
            console.error(
              'No reviews data found or unexpected response structure'
            );
          }
        } else {
          console.error('Failed to fetch reviews. Status:', res.status);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      }
    };

    fetchReviews();
  }, [id]);

  // Check if the cafe is favorited when the component mounts or `cafeId` changes
  useEffect(() => {
    const checkIfFavorited = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('User not logged in');
        return;
      }

      const decoded = jwtDecode<DecodedToken>(token);
      const userId = decoded.id; // Assuming `id` is the field where `userId` is stored
      if (!userId || !id) return;

      try {
        const response = await fetch(
          `http://localhost:8000/favoriteCafe/isFavorited/${userId}/${id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to check favorite status');
        }

        const data = await response.json(); // Parse the response body as JSON
        console.log('Backend Response:', data); // Debugging: Log the response

        // Ensure data.isFavorited is a boolean
        const isFavorited = Boolean(data.isFavorited);
        console.log('Parsed isFavorited:', isFavorited); // Debugging: Log the parsed value

        setIsFavorite(isFavorited); // Update the isFavorite state
      } catch (error) {
        console.error('Error checking if cafe is favorited:', error);
      }
    };

    checkIfFavorited();
  }, [id]); // Re-run when `cafeId` changes
  const toggleFavorite = async () => {
    try {
      // Retrieve token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not logged in');
      }

      // Decode the token to get userId
      const decoded = jwtDecode<DecodedToken>(token);
      const userId = decoded.id; // Assuming `id` is the field where `userId` is stored

      if (!userId) {
        throw new Error('User ID not found in token');
      }

      // Proceed with the favorite toggling
      const url = `http://localhost:8000/favoriteCafe/${isFavorite ? 'delete' : 'add'}`;
      const method = isFavorite ? 'DELETE' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, cafeId: id }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      // Re-fetch the favorite status to ensure the UI is up-to-date
      const checkResponse = await fetch(
        `http://localhost:8000/favoriteCafe/isFavorited/${userId}/${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!checkResponse.ok) {
        throw new Error('Failed to check favorite status');
      }

      const data = await checkResponse.json();
      setIsFavorite(data.isFavorited); // Update the isFavorite state
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  if (!cafe || !cafe.photos)
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        No photos available
      </div>
    );

  const handleSlide = (direction: 'prev' | 'next') => {
    if (isTransitioning || !cafe.photos) return;

    setIsTransitioning(true);

    setCurrentImageIndex((prevIndex) => {
      if (!cafe?.photos || cafe.photos.length === 0) {
        return 0;
      }

      if (direction === 'next') {
        return prevIndex >= cafe.photos.length - 1 ? 0 : prevIndex + 1;
      } else {
        return prevIndex <= 0 ? cafe.photos.length - 1 : prevIndex - 1;
      }
    });

    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewReview('');
    setRating(0);
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    if (rating === 0) {
      alert('Please select a star rating before submitting your review.');
      return;
    }

    const decoded = jwtDecode<DecodedToken>(token);
    const userId = decoded.id; // Assuming `id` is the field where `userId` is stored

    try {
      const response = await fetch(`http://localhost:8000/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          cafeId: id,
          rating,
          description: newReview,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        alert('Review submitted successfully!');
        setNewReview('');
        setRating(0);
      } else {
        alert(`Failed to submit review: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const getCurrentDay = () => {
    const daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const today = new Date().getDay(); // getDay() returns a number from 0 (Sunday) to 6 (Saturday)
    return daysOfWeek[today];
  };

  const currentDay = getCurrentDay();
  const hoursToday = cafe.hours ? cafe.hours[currentDay] : null;

  //Sort reviews by date (most recent first)
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-coffee-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-coffee-800 mb-2">
              {cafe.name}
            </h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="w-5 h-5 text-coffee-400 fill-current" />
                <span className="ml-1 font-semibold">{cafe.rating}</span>
                <span className="text-coffee-500 ml-1">
                  ({cafe.numOfRatings} reviews)
                </span>
              </div>
              <span className="text-coffee-400">•</span>
              <span className="text-coffee-600">
                {cafe.status && typeof cafe.status === 'string'
                  ? `${cafe.status.charAt(0).toUpperCase()}${cafe.status.slice(1)}: ${hoursToday}`
                  : `Status not available: ${hoursToday}`}
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            {/* <button
              onClick={toggleFavorite}
              className={`p-2 rounded-full ${isFavorite ? 'bg-coffee-100 text-coffee-600' : 'bg-white text-coffee-400'} hover:bg-coffee-100 transition-colors`}
            >
              <Heart
                className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`}
              />
            </button> */}
            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-full ${isFavorite ? 'bg-coffee-100 text-coffee-600' : 'bg-white text-coffee-400'} hover:bg-coffee-100 transition-colors`}
            >
              <Heart
                className="w-6 h-6"
                fill={isFavorite ? 'currentColor' : 'none'} // Explicitly set fill
                stroke="currentColor" // Ensure the stroke matches the text color
              />
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative overflow-hidden mb-8">
          {/* Navigation Buttons */}
          <button
            onClick={() => handleSlide('prev')}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 transition-colors backdrop-blur-sm"
            disabled={isTransitioning}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleSlide('next')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 transition-colors backdrop-blur-sm"
            disabled={isTransitioning}
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          {/* Carousel Container */}
          <div
            ref={carouselRef}
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(-${currentImageIndex * (100 / 3)}%)`,
            }}
          >
            {cafe.photos.map((photo, index) => (
              <div key={index} className="w-1/3 flex-shrink-0 px-2">
                <img
                  src={photo}
                  alt={`Cafe photo ${index + 1}`}
                  className="w-full h-64 object-cover rounded-xl"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="col-span-2 space-y-8">
            {/* Keywords Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                Keywords
              </h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {cafe.keywords?.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-coffee-50 text-coffee-600 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              {cafe.matchingKeywords && cafe.matchingKeywords.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                    Matching Keywords
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {cafe.matchingKeywords.map(
                      (keyword: KeywordMatch, index: number) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-coffee-50 text-coffee-600 rounded-full text-sm"
                        >
                          {keyword.keyword} (
                          {Math.round(keyword.confidence * 66.67)}%)
                        </span>
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Vibes & Dietary Options */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                Vibes & Dietary Options
              </h2>
              <div className="mb-6">
                <p className="text-coffee-600 font-semibold">Ambiance:</p>
                <p className="text-coffee-500">
                  {cafe.ambiance &&
                    (typeof cafe.ambiance === 'string'
                      ? cafe.ambiance.charAt(0).toUpperCase() +
                        cafe.ambiance.slice(1) // Capitalize first letter for string
                      : Array.isArray(cafe.ambiance) && cafe.ambiance.length > 0
                        ? cafe.ambiance
                            .map(
                              (item) =>
                                item.charAt(0).toUpperCase() + item.slice(1)
                            ) // Capitalize first letter for array items
                            .join(', ') // Join with commas
                        : 'Not specified')}
                </p>

                <div className="mb-6">
                  <p className="text-coffee-600 font-semibold">
                    Dietary Options:
                  </p>
                  <p className="text-coffee-500">
                    {cafe.dietaryOptions &&
                      (typeof cafe.dietaryOptions === 'string'
                        ? cafe.dietaryOptions.charAt(0).toUpperCase() +
                          cafe.dietaryOptions.slice(1) // Capitalize first letter for string
                        : Array.isArray(cafe.dietaryOptions) &&
                            cafe.dietaryOptions.length > 0
                          ? cafe.dietaryOptions
                              .map(
                                (item) =>
                                  item.charAt(0).toUpperCase() + item.slice(1)
                              ) // Capitalize first letter for array items
                              .join(', ') // Join with commas
                          : 'Not specified')}
                  </p>
                </div>
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
                <span className="text-coffee-600">
                  {cafe.phone || 'Phone not available'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-coffee-500 mt-1" />
                <span className="text-coffee-600">{cafe.address}</span>
              </div>
            </div>

            {/* Hours of Operation */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                Hours of Operation
              </h2>
              <ul className="space-y-2">
                {cafe.hours ? (
                  // Loop through all days of the week
                  [
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday',
                  ].map((day) => (
                    <li key={day} className="flex justify-between">
                      <span className="text-coffee-600 font-medium">{day}</span>
                      <span className="text-coffee-500">
                        {cafe.hours?.[day] ?? 'Closed'}{' '}
                        {/* Default to 'Closed' if no hours for the day */}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-coffee-500">No hours available</li>
                )}
              </ul>
            </div>

            {/* Map */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-64 bg-coffee-100 rounded-lg">
                {cafe?.location?.coordinates?.[0] !== undefined &&
                cafe?.location?.coordinates?.[1] !== undefined ? (
                  <GoogleMapComponent
                    lat={cafe.location.coordinates[1]} // Latitude
                    lng={cafe.location.coordinates[0]} // Longitude
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-coffee-400">
                    Location not available
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Bottom Section - Spanning full width */}
          <div className="col-span-3 space-y-8">
            {/* Reviews Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-coffee-800 mb-4">
                Reviews
              </h2>
              <div className="space-y-6">
                {reviews.length > 0 ? (
                  sortedReviews.map((review) => (
                    <div key={review.id} className="border-b py-4">
                      <div className="flex items-center mb-2">
                        <img
                          src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png" // Using a default avatar image
                          alt="Default User Avatar"
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex justify-between w-full">
                          <div className="ml-4">
                            {' '}
                            {/* Added margin to the left */}
                            <p className="font-semibold">
                              {review.firstName} {review.lastName}
                            </p>
                            <div className="flex items-center text-yellow-500">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} size={16} fill="currentColor" />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700">{review.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No reviews yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Restaurant;
