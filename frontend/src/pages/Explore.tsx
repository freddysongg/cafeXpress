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

  useEffect(() => {
    if (!map) return;

    markers.forEach((marker) => marker.setMap(null));
    const newMarkers: google.maps.Marker[] = [];

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

        marker.addListener('click', () => {
          navigate(`/restaurant/${cafe.id}`);
        });

        newMarkers.push(marker);
      }
    });

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

  // Update category color helper
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ambiance':
        return 'bg-violet-50 text-violet-700 border border-violet-200';
      case 'dietary':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'activity':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-sky-50 text-sky-700 border border-sky-200';
    }
  };

  // Update confidence indicator helper
  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.8) return '●●●';
    if (confidence >= 0.6) return '●●○';
    return '●○○';
  };

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
          <div className="flex gap-4 mb-6 flex-wrap">
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
                  className="bg-white text-black font-normal px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm"
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
          {/* Matching Keywords Section - Updated with category colors */}
          {matchingKeywords.length > 0 && (
            <div className="mb-6 bg-white/50 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-coffee-700 mb-2">
                Matching Preferences
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchingKeywords.map((keyword, index) => {
                  const categoryColor = getCategoryColor(keyword.category);
                  return (
                    <div
                      key={`${keyword.category}-${keyword.keyword}-${index}`}
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${categoryColor} transition-colors duration-150`}
                    >
                      <span>{keyword.keyword}</span>
                      <span className="text-xs opacity-75 tracking-wider">
                        {getConfidenceIndicator(keyword.confidence)}
                      </span>
                    </div>
                  );
                })}
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
          {/* Café Cards - Updated with inline keyword matches */}
          {!loading && !error && cafes.length === 0 && (
            <div className="text-center py-8 text-coffee-600">
              <p>No cafes found matching your search criteria</p>
            </div>
          )}
          {!loading && !error && cafes.length > 0 && (
            <div className="space-y-6">
              {cafes.map((cafe) => (
                <div
                  key={cafe.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="flex">
                    {/* Image container with fixed dimensions */}
                    <div className="w-48 h-48 flex-shrink-0">
                      <img
                        src={cafe.metadata.photos?.[0] || 'default-image-url'}
                        alt={cafe.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Content container */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-semibold text-coffee-800">
                          {cafe.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500">★</span>
                          <span>{cafe.metadata.rating}</span>
                          <span className="text-gray-500">
                            ({cafe.metadata.reviewCount})
                          </span>
                        </div>
                      </div>
                      {/* Location and status */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <span>{cafe.distance?.toFixed(1)} mi</span>
                        </span>
                        <span className="text-green-600">Open Now</span>
                      </div>
                      {/* Categories */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {cafe.metadata.keywords?.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* Matching keywords */}
                      {cafe.matchingKeywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {cafe.matchingKeywords.map((match, idx) => {
                            const categoryColor = getCategoryColor(
                              match.category
                            );
                            return (
                              <div
                                key={`${match.category}-${match.keyword}-${idx}`}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${categoryColor}`}
                              >
                                <span>{match.keyword}</span>
                                <span className="opacity-75 text-[10px] tracking-wider">
                                  {getConfidenceIndicator(match.confidence)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Explore;
