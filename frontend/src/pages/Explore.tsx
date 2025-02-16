import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '../components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import CafeCard from '../components/CafeCard';
import {
  getRecommendations,
  type CafeRecommendation,
  type Location,
} from '../services/api';
import SearchBar from '../components/SearchBar';
import debounce from 'lodash.debounce';

const filterOptions = {
  distance: ['1', '5', '10', '20'], // in kilometers
  ambiance: ['Cozy', 'Modern', 'Quiet', 'Lively'],
  dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'],
  activities: ['Wifi', 'Study', 'Meeting', 'Games'],
};

type SearchFilters = {
  dietary?: string[];
  activities?: string[];
  ambiance?: string[];
  radius?: number;
};

function Explore() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [cafes, setCafes] = useState<CafeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const debouncedSearchFn = useRef(
    debounce(
      async (
        query: string | null,
        filters: SearchFilters,
        location: Location | null,
        callbacks: {
          setCafes: typeof setCafes;
          setSearchParams: typeof setSearchParams;
          setError: typeof setError;
          setLoading: typeof setLoading;
        }
      ) => {
        try {
          const recommendations = await getRecommendations({
            query: query || undefined,
            location: location || undefined,
            filters,
          });
          callbacks.setCafes(recommendations);
          if (query) callbacks.setSearchParams({ q: query });
        } catch (error) {
          console.error('Error searching cafes:', error);
          callbacks.setError('Failed to search cafes');
        } finally {
          callbacks.setLoading(false);
        }
      },
      1000
    )
  ).current;

  const handleSearch = useCallback(
    (query: string) => {
      setLoading(true);
      setError(null);
      const filters = {
        dietary: selectedFilters.dietary
          ? [selectedFilters.dietary]
          : undefined,
        activities: selectedFilters.activities
          ? [selectedFilters.activities]
          : undefined,
        ambiance: selectedFilters.ambiance
          ? [selectedFilters.ambiance]
          : undefined,
        radius: selectedFilters.distance
          ? parseFloat(selectedFilters.distance)
          : undefined,
      };
      debouncedSearchFn(query, filters, userLocation, {
        setCafes,
        setSearchParams,
        setError,
        setLoading,
      });
    },
    [selectedFilters, userLocation, debouncedSearchFn, setSearchParams]
  );

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
      });

      try {
        const { Map } = await loader.importLibrary('maps');
        if (mapRef.current) {
          const newMap = new Map(mapRef.current, {
            center: { lat: 40.7128, lng: -74.006 },
            zoom: 13,
            clickableIcons: true,
            disableDefaultUI: false,
            gestureHandling: 'auto',
          });
          setMap(newMap);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setError('Failed to load map');
      }
    };

    initMap();
  }, []);

  // Update markers when cafes change
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));
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
            lat: cafe.metadata.location.coordinates[1],
            lng: cafe.metadata.location.coordinates[0],
          },
          map,
          title: cafe.name,
        });
        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);

    // Center map on user location or first cafe
    if (userLocation) {
      map.setCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      });
    } else if (cafes.length > 0 && cafes[0].metadata.location) {
      map.setCenter({
        lat: cafes[0].metadata.location.coordinates[1],
        lng: cafes[0].metadata.location.coordinates[0],
      });
    }

    return () => {
      newMarkers.forEach((marker) => marker.setMap(null));
    };
  }, [map, cafes, userLocation, markers]);

  // Get initial location and search only once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);

          // Only search if there's an initial query in the URL
          const searchQuery = searchParams.get('q');
          if (searchQuery) {
            const filters = {
              dietary: selectedFilters.dietary
                ? [selectedFilters.dietary]
                : undefined,
              activities: selectedFilters.activities
                ? [selectedFilters.activities]
                : undefined,
              ambiance: selectedFilters.ambiance
                ? [selectedFilters.ambiance]
                : undefined,
              radius: selectedFilters.distance
                ? parseFloat(selectedFilters.distance)
                : undefined,
            };
            debouncedSearchFn(searchQuery, filters, location, {
              setCafes,
              setSearchParams,
              setError,
              setLoading,
            });
          } else {
            setLoading(false);
          }
        },
        () => {
          console.error('Location permission denied');
          setLoading(false);
          // Only search if there's an initial query
          const searchQuery = searchParams.get('q');
          if (searchQuery) {
            handleSearch(searchQuery);
          }
        }
      );
    }
  }, [
    debouncedSearchFn,
    handleSearch,
    searchParams,
    selectedFilters.activities,
    selectedFilters.ambiance,
    selectedFilters.dietary,
    selectedFilters.distance,
    setSearchParams,
  ]);

  const handleFilterSelect = (category: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  // Trigger search when filters change
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      handleSearch(query);
    }
  }, [selectedFilters, handleSearch, searchParams]);

  const FilterButton = ({ category }: { category: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-white text-black font-medium hover:bg-gray-100 capitalize flex items-center gap-2">
          {category}
          <ChevronDown className="ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white text-black">
        {filterOptions[category as keyof typeof filterOptions].map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => handleFilterSelect(category, option)}
            className={
              selectedFilters[category] === option
                ? 'bg-accent'
                : 'hover:bg-gray-100'
            }
          >
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex h-screen pt-16">
      {/* Map Section */}
      <div className="w-1/2 h-full relative">
        <div
          ref={mapRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </div>
      {/* Cafés List Section */}
      <div className="w-1/2 h-full overflow-y-auto bg-coffee-50 p-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-coffee-800">
            Nearby Cafés
          </h2>
          <SearchBar
            initialQuery={searchParams.get('q') || ''}
            onSearch={handleSearch}
            className="mb-6"
          />
          {/* Filter Buttons */}
          <div className="flex gap-4 mb-6">
            <FilterButton category="distance" />
            <FilterButton category="ambiance" />
            <FilterButton category="dietary" />
            <FilterButton category="activities" />
          </div>
          {/* Selected Filters */}
          {Object.keys(selectedFilters).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(selectedFilters).map(([category, value]) => (
                <div
                  key={category}
                  className="bg-white text-black font-normal px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-md"
                >
                  {value}
                  <button
                    onClick={() => {
                      const newFilters = { ...selectedFilters };
                      delete newFilters[category];
                      setSelectedFilters(newFilters);
                    }}
                    className="hover:text-muted-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Loading and Error States */}
          {loading && (
            <div className="text-center py-8">
              <p>Loading cafes...</p>
            </div>
          )}
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
                  cafe={
                    {
                      id: cafe.id,
                      name: cafe.name,
                      image:
                        cafe.metadata.photos?.[0] ||
                        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80',
                      rating: cafe.metadata.rating,
                      reviews: cafe.metadata.reviewCount,
                      distance:
                        cafe.distance?.toFixed(1) + ' km' || 'Distance unknown',
                      address: cafe.address,
                      isOpen: true, // TODO: Add opening hours logic
                      tags: cafe.metadata.keywords,
                    } as const
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Explore;
