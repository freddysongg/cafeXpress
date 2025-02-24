import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '../components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  type KeywordMatch,
} from '../services/api';
import SearchBar from '../components/SearchBar';
import debounce from 'lodash.debounce';

const filterOptions = {
  distance: ['1', '5', '10', '20'],
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

const RIVERSIDE_COORDINATES = { lat: 33.9806, lng: -117.3755 } as const;

const mapLoader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['places'],
});

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
  const [matchingKeywords, setMatchingKeywords] = useState<KeywordMatch[]>([]);
  const navigate = useNavigate();

  const debouncedSearchFn = useRef(
    debounce(
      async (
        query: string | null,
        filters: SearchFilters,
        location: Location | null,
        callbacks: {
          setCafes: typeof setCafes;
          setMatchingKeywords: typeof setMatchingKeywords;
          setSearchParams: typeof setSearchParams;
          setError: typeof setError;
          setLoading: typeof setLoading;
        }
      ) => {
        try {
          const recommendations = await getRecommendations({
            query: query || undefined,
            location: location || undefined,
            filters: {
              dietary: filters.dietary,
              ambiance: filters.ambiance,
              activities: filters.activities,
              radius: filters.radius,
            },
          });

          callbacks.setCafes(recommendations);
          // Extract all unique matching keywords
          const allKeywords = recommendations.flatMap(
            (cafe) => cafe.matchingKeywords
          );
          const uniqueKeywords = Array.from(
            new Map(
              allKeywords.map((k) => [`${k.category}:${k.keyword}`, k])
            ).values()
          );
          callbacks.setMatchingKeywords(uniqueKeywords);

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
    (query: string, searchFilters?: SearchFilters) => {
      setLoading(true);
      setError(null);
      const filters = searchFilters || {
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
        setMatchingKeywords,
        setSearchParams,
        setError,
        setLoading,
      });
    },
    [selectedFilters, userLocation, debouncedSearchFn, setSearchParams]
  );

  const searchFilters = useMemo(
    () => ({
      dietary: selectedFilters.dietary ? [selectedFilters.dietary] : undefined,
      activities: selectedFilters.activities
        ? [selectedFilters.activities]
        : undefined,
      ambiance: selectedFilters.ambiance
        ? [selectedFilters.ambiance]
        : undefined,
      radius: selectedFilters.distance
        ? parseFloat(selectedFilters.distance)
        : undefined,
    }),
    [selectedFilters]
  );

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        const { Map } = await mapLoader.importLibrary('maps');
        if (mapRef.current) {
          const newMap = new Map(mapRef.current, {
            center: RIVERSIDE_COORDINATES,
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

    // Add cafe markers
    cafes.forEach((cafe) => {
      if (cafe.metadata?.location?.coordinates) {
        const marker = new google.maps.Marker({
          map,
          position: {
            lat: cafe.metadata.location.coordinates[1],
            lng: cafe.metadata.location.coordinates[0],
          },
          title: cafe.name,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          },
        });

        // Add click listener to navigate to cafe page
        marker.addListener('click', () => {
          navigate(`/restaurant/${cafe.id}`);
        });

        newMarkers.push(marker);
      }
    });

    // Add user location marker if available
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        map,
        position: {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        },
        title: 'Your Location',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        },
      });
      newMarkers.push(userMarker);
    }

    setMarkers(newMarkers);

    // Center map on first cafe or user location
    if (cafes.length > 0 && cafes[0].metadata?.location?.coordinates) {
      map.setCenter({
        lat: cafes[0].metadata.location.coordinates[1],
        lng: cafes[0].metadata.location.coordinates[0],
      });
    } else if (userLocation) {
      map.setCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, cafes, userLocation, navigate]);

  useEffect(() => {
    const searchQuery = searchParams.get('q');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);

          if (searchQuery) {
            setLoading(true);
            handleSearch(searchQuery, searchFilters);
          } else {
            setLoading(false);
          }
        },
        () => {
          console.error('Location permission denied');
          if (searchQuery) {
            setLoading(true);
            handleSearch(searchQuery, searchFilters);
          }
          setLoading(false);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleFilterSelect = (category: string, value: string) => {
    setSelectedFilters((prev) => {
      const newFilters = {
        ...prev,
        [category]: value,
      };

      const searchQuery = searchParams.get('q');
      if (searchQuery) {
        setLoading(true);
        debouncedSearchFn(
          searchQuery,
          {
            dietary: newFilters.dietary ? [newFilters.dietary] : undefined,
            activities: newFilters.activities
              ? [newFilters.activities]
              : undefined,
            ambiance: newFilters.ambiance ? [newFilters.ambiance] : undefined,
            radius: newFilters.distance
              ? parseFloat(newFilters.distance)
              : undefined,
          },
          userLocation,
          {
            setCafes,
            setMatchingKeywords,
            setSearchParams,
            setError,
            setLoading,
          }
        );
      }

      return newFilters;
    });
  };

  const handleFilterRemove = (category: string) => {
    setSelectedFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[category];

      const searchQuery = searchParams.get('q');
      if (searchQuery) {
        setLoading(true);
        debouncedSearchFn(
          searchQuery,
          {
            dietary: newFilters.dietary ? [newFilters.dietary] : undefined,
            activities: newFilters.activities
              ? [newFilters.activities]
              : undefined,
            ambiance: newFilters.ambiance ? [newFilters.ambiance] : undefined,
            radius: newFilters.distance
              ? parseFloat(newFilters.distance)
              : undefined,
          },
          userLocation,
          {
            setCafes,
            setMatchingKeywords,
            setSearchParams,
            setError,
            setLoading,
          }
        );
      }

      return newFilters;
    });
  };

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
                    onClick={() => handleFilterRemove(category)}
                    className="hover:text-muted-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Matching Keywords Section */}
          {matchingKeywords.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-coffee-700 mb-2">
                Matching Keywords:
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchingKeywords.map((keyword, index) => (
                  <span
                    key={`${keyword.category}-${keyword.keyword}-${index}`}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      keyword.category === 'ambiance'
                        ? 'bg-blue-100 text-blue-800'
                        : keyword.category === 'dietary'
                          ? 'bg-green-100 text-green-800'
                          : keyword.category === 'activity'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {keyword.keyword}
                  </span>
                ))}
              </div>
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
                  cafe={{
                    id: cafe.id,
                    name: cafe.name,
                    image: cafe.metadata.photos?.[0] || 'default-image-url',
                    rating: cafe.metadata.rating || 0,
                    reviews: cafe.metadata.reviewCount || 0,
                    distance: cafe.distance?.toFixed(1) || '0',
                    address: cafe.metadata.address || '',
                    isOpen: true,
                    tags: cafe.metadata.keywords || [],
                    matchingKeywords: cafe.matchingKeywords,
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

export default Explore;
