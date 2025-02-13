import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import CafeCard from '../components/CafeCard';
import SearchBar from '../components/SearchBar';
import {
  getRecommendations,
  Recommendation,
  Location,
  RecommendationRequest,
} from '../services/api';
import { useSearchParams } from 'react-router-dom';

function Explore() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [cafes, setCafes] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
        });

        const google = await loader.load();

        if (mapRef.current && !map) {
          const defaultCenter = { lat: 33.9806, lng: 117.3755 }; // Default location
          const newMap = new google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 13,
          });
          setMap(newMap);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    if (!map) {
      initMap();
    }
  }, [map]);

  // Update map center when user location changes
  useEffect(() => {
    if (map && userLocation) {
      const center = {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      };
      map.setCenter(center);

      const userMarker = new google.maps.Marker({
        position: center,
        map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      return () => {
        userMarker.setMap(null);
      };
    }
  }, [map, userLocation]);

  // Update markers when cafes change
  useEffect(() => {
    if (map) {
      const newMarkers: google.maps.Marker[] = [];

      // Add user location marker if available
      if (userLocation) {
        const userMarker = new google.maps.Marker({
          position: {
            lat: userLocation.latitude,
            lng: userLocation.longitude,
          },
          map,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        newMarkers.push(userMarker);
      }

      // Add cafe markers
      cafes.forEach((cafe) => {
        if (cafe.metadata.location) {
          const marker = new google.maps.Marker({
            position: {
              lat: cafe.metadata.location.latitude,
              lng: cafe.metadata.location.longitude,
            },
            map,
            title: cafe.name,
          });
          newMarkers.push(marker);
        }
      });

      return () => {
        newMarkers.forEach((marker) => marker.setMap(null));
      };
    }
  }, [map, cafes, userLocation]);

  // Handle search and recommendations
  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const request: RecommendationRequest = {
        location: userLocation || undefined,
        preferences: {
          ambiance: query ? [query] : undefined,
        },
      };

      const recommendations = await getRecommendations(request);
      setCafes(recommendations);
      // Update URL with search query
      setSearchParams(query ? { q: query } : {});
    } catch (error) {
      console.error('Error searching cafes:', error);
      setError('Failed to search cafes');
    } finally {
      setLoading(false);
    }
  };

  // Get initial recommendations and location
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setUserLocation(location);

              const searchQuery = searchParams.get('q');
              const request: RecommendationRequest = {
                location,
                preferences: {
                  ambiance: searchQuery ? [searchQuery] : undefined,
                },
              };

              const recommendations = await getRecommendations(request);
              setCafes(recommendations);
              setLoading(false);
            },
            () => {
              // Fallback if location permission denied
              const searchQuery = searchParams.get('q');
              getRecommendations({
                preferences: {
                  ambiance: searchQuery ? [searchQuery] : undefined,
                },
              }).then((recommendations) => {
                setCafes(recommendations);
                setLoading(false);
              });
            }
          );
        } else {
          const searchQuery = searchParams.get('q');
          const recommendations = await getRecommendations({
            preferences: {
              ambiance: searchQuery ? [searchQuery] : undefined,
            },
          });
          setCafes(recommendations);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError('Failed to load recommendations');
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [searchParams]);

  return (
    <div className="flex h-screen pt-16">
      {/* Map Section */}
      <div ref={mapRef} className="w-1/2 h-full" />

      {/* Cafés List Section */}
      <div className="w-1/2 h-full overflow-y-auto bg-coffee-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col gap-6 mb-6">
            <h2 className="text-2xl font-bold text-coffee-800">
              {userLocation ? 'Nearby Cafés' : 'Recommended Cafés'}
              {searchParams.get('q') && ` matching "${searchParams.get('q')}"`}
            </h2>

            {/* Search Input */}
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search cafes, cuisine, or atmosphere..."
              className="max-w-full"
            />

            {/* Filters */}
            <div className="flex gap-4 overflow-x-auto pb-2">
              <button className="btn-filter">Open Now</button>
              <button className="btn-filter">Top Rated</button>
              <button className="btn-filter">Distance</button>
              <button className="btn-filter">Price</button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee-600 mx-auto"></div>
              <p className="mt-4 text-coffee-600">Loading recommendations...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
            </div>
          )}

          {/* Café Cards */}
          {!loading && !error && cafes.length === 0 && (
            <div className="text-center py-8 text-coffee-600">
              <p>No cafes found matching your search criteria</p>
            </div>
          )}

          {!loading && !error && cafes.length > 0 && (
            <div className="space-y-6">
              {cafes.map((cafe) => (
                <CafeCard
                  key={cafe.id}
                  cafe={{
                    id: parseInt(cafe.id),
                    name: cafe.name,
                    image:
                      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80',
                    rating: cafe.metadata.rating,
                    reviews: cafe.metadata.reviewCount,
                    distance:
                      userLocation && cafe.metadata.location
                        ? calculateDistance(
                            userLocation,
                            cafe.metadata.location
                          ).toFixed(1) + ' km'
                        : 'Distance unknown',
                    address: cafe.metadata.address,
                    isOpen: true,
                    tags: cafe.metadata.tags || [],
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate distance between two points in kilometers
function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371;
  const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.latitude * Math.PI) / 180) *
      Math.cos((point2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default Explore;
