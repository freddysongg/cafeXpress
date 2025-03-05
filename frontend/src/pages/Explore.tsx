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

const DEFAULT_FILTER_OPTIONS = {
  ambiance: ['Modern', 'Rustic', 'Industrial', 'Traditional'],
  dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'],
};

type SearchFilters = {
  dietary?: string[];
  activities?: string[];
  ambiance?: string[];
  radius?: number;
};

const RIVERSIDE_COORDINATES = { lat: 33.9806, lng: -117.3755 } as const;

// Add the MarkerLibrary interface after the imports
interface MarkerLibrary {
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
  PinElement: typeof google.maps.marker.PinElement;
}

// Update the mapLoader configuration
const mapLoader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  version: 'beta', // Changed to beta for advanced markers
  libraries: ['places', 'marker'],
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
  const [markers, setMarkers] = useState<
    google.maps.marker.AdvancedMarkerElement[]
  >([]);
  const [infoWindows, setInfoWindows] = useState<google.maps.InfoWindow[]>([]);
  const [matchingKeywords, setMatchingKeywords] = useState<KeywordMatch[]>([]);
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
  const navigate = useNavigate();

  const updateFilterOptions = useCallback((keywords: KeywordMatch[]) => {
    const analyzedKeywords = new Set(
      keywords.map((k) => k.keyword.toLowerCase())
    );

    setFilterOptions({
      ambiance: DEFAULT_FILTER_OPTIONS.ambiance.filter(
        (k) => !analyzedKeywords.has(k.toLowerCase())
      ),
      dietary: DEFAULT_FILTER_OPTIONS.dietary.filter(
        (k) => !analyzedKeywords.has(k.toLowerCase())
      ),
    });
  }, []);

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
              radius: filters.radius,
            },
          });

          callbacks.setCafes(recommendations);
          const allKeywords = recommendations.flatMap(
            (cafe) => cafe.matchingKeywords || []
          );
          const uniqueKeywords = Array.from(
            new Map(
              allKeywords.map((k) => [`${k.category}:${k.keyword}`, k])
            ).values()
          );
          callbacks.setMatchingKeywords(uniqueKeywords);
          updateFilterOptions(uniqueKeywords);

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
            clickableIcons: false,
            disableDefaultUI: false,
            gestureHandling: 'auto',
            mapId: import.meta.env.VITE_GOOGLE_MAPS_ID || '',
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
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

    const updateMarkers = async () => {
      try {
        const { AdvancedMarkerElement, PinElement } =
          (await google.maps.importLibrary('marker')) as MarkerLibrary;

        // Clear existing markers and info windows
        markers.forEach((marker) => (marker.map = null));
        infoWindows.forEach((window) => window.close());

        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
        const newInfoWindows: google.maps.InfoWindow[] = [];

        // Create markers for top 5 cafes
        cafes.slice(0, 5).forEach((cafe, index) => {
          const coordinates =
            cafe.metadata?.location?.coordinates || cafe.location?.coordinates;

          if (coordinates) {
            const position = {
              lat: coordinates[1],
              lng: coordinates[0],
            };

            const isTopResult = index === 0;

            const pin = new PinElement({
              background: isTopResult ? '#4A2C1C' : '#8B5E3C',
              borderColor: isTopResult ? '#2C1810' : '#4A2C1C',
              glyphColor: '#FFF5EB',
              scale: isTopResult ? 1.4 : 1.2,
              glyph: `${index + 1}`,
            });

            const marker = new AdvancedMarkerElement({
              map,
              position,
              title: cafe.name,
              content: pin.element,
              zIndex: isTopResult ? 2 : 1,
              collisionBehavior: google.maps.CollisionBehavior.REQUIRED,
            });

            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="
                  padding: 12px;
                  max-width: 240px;
                  font-family: system-ui, -apple-system, sans-serif;
                  text-align: center;
                ">
                  <h3 style="
                    margin: 0 0 8px 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #4A2C1C;
                  ">${cafe.name}</h3>
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    margin-bottom: 8px;
                    color: #8B5E3C;
                  ">
                    <span style="color: #D4A574">★</span>
                    <span>${Number(cafe.metadata.rating || cafe.rating).toFixed(1)}</span>
                  </div>
                  <div style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    justify-content: center;
                    margin-bottom: 8px;
                  ">
                    ${(cafe.metadata.keywords || cafe.keywords)
                      ?.slice(0, 2)
                      .map(
                        (tag) =>
                          `<span style="
                        background: #FFF5EB;
                        color: #8B5E3C;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 500;
                      ">${tag}</span>`
                      )
                      .join('')}
                  </div>
                  <button 
                    onclick="window.location.href='/restaurant/${cafe.id}'"
                    style="
                      width: 100%;
                      background: #4A2C1C;
                      color: #FFF5EB;
                      border: none;
                      padding: 6px 12px;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 500;
                      cursor: pointer;
                      transition: background-color 0.2s;
                    "
                    onmouseover="this.style.backgroundColor='#2C1810'"
                    onmouseout="this.style.backgroundColor='#4A2C1C'"
                  >View Details</button>
                </div>
              `,
              pixelOffset: new google.maps.Size(0, -5),
              disableAutoPan: false,
              maxWidth: 240,
            });

            // Add click event listener to marker
            marker.addEventListener('click', () => {
              // Close all other info windows first
              infoWindows.forEach((window) => window.close());

              // Open this info window
              infoWindow.open({
                anchor: marker,
                map,
                shouldFocus: true,
              });

              // Center the map on this marker with a slight offset for the info window
              map.panTo(position);
            });

            newMarkers.push(marker);
            newInfoWindows.push(infoWindow);
          }
        });

        setMarkers(newMarkers);
        setInfoWindows(newInfoWindows);

        // Center map on first cafe
        if (cafes.length > 0) {
          const firstCafe = cafes[0];
          const firstCoords =
            firstCafe.metadata?.location?.coordinates ||
            firstCafe.location?.coordinates;

          if (firstCoords) {
            const center = {
              lat: firstCoords[1],
              lng: firstCoords[0],
            };

            map.setCenter(center);
            map.setZoom(13);
          }
        }
      } catch (error) {
        console.error('Error updating markers:', error);
      }
    };

    updateMarkers();
  }, [map, cafes, navigate]);

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
      if (category === 'distance') {
        const isCurrentlySelected = prev.distance === value;
        const newFilters = { ...prev };

        if (isCurrentlySelected) {
          delete newFilters.distance;
        } else {
          newFilters.distance = value;
          setCafes((currentCafes) => sortCafes(currentCafes, newFilters));
        }

        return newFilters;
      }

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
            ambiance: newFilters.ambiance ? [newFilters.ambiance] : undefined,
            radius: undefined,
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

  const sortCafes = useCallback(
    (cafes: CafeRecommendation[], filters: Record<string, string>) => {
      const sortedCafes = [...cafes];

      if (filters.distance) {
        return sortedCafes.sort(
          (a, b) => (a.distance || 0) - (b.distance || 0)
        );
      }

      return sortedCafes;
    },
    []
  );

  const DistanceButton = () => (
    <Button
      onClick={() => handleFilterSelect('distance', 'nearest')}
      className={`
        bg-white text-black font-medium
        ${selectedFilters.distance ? 'bg-accent text-accent-foreground' : 'hover:bg-gray-100'}
        flex items-center gap-2
      `}
    >
      Sort by Distance
    </Button>
  );

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

  // Update confidence indicator helper
  const getConfidenceIndicator = (confidence: number) => {
    const absConfidence = Math.abs(confidence);
    if (absConfidence >= 0.8) return '●●●';
    if (absConfidence >= 0.5) return '●●○';
    return '●○○';
  };

  // Update category color helper with confidence-based opacity
  const getCategoryColor = (category: string, confidence: number) => {
    const isNegative = confidence < 0;
    const baseColors = {
      ambiance: isNegative
        ? 'bg-violet-50/50 text-violet-700/50 border-violet-200/50'
        : 'bg-violet-50 text-violet-700 border-violet-200',
      dietary: isNegative
        ? 'bg-emerald-50/50 text-emerald-700/50 border-emerald-200/50'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      activity: isNegative
        ? 'bg-amber-50/50 text-amber-700/50 border-amber-200/50'
        : 'bg-amber-50 text-amber-700 border-amber-200',
      general: isNegative
        ? 'bg-sky-50/50 text-sky-700/50 border-sky-200/50'
        : 'bg-sky-50 text-sky-700 border-sky-200',
    };
    return (
      baseColors[category as keyof typeof baseColors] || baseColors.general
    );
  };

  // Format confidence score for display
  const formatConfidence = (confidence: number) => {
    const absConfidence = Math.abs(confidence);
    return `${(absConfidence * 100).toFixed(0)}%`;
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
            <DistanceButton />
            {Object.keys(filterOptions).map((category) => (
              <FilterButton key={category} category={category} />
            ))}
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
          {/* Matching Keywords Section */}
          {matchingKeywords.length > 0 && (
            <div className="mb-6 bg-white/50 rounded-lg p-4 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-coffee-700 mb-2">
                Matching Preferences
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchingKeywords.map((keyword, index) => {
                  const categoryColor = getCategoryColor(
                    keyword.category,
                    keyword.confidence
                  );
                  return (
                    <div
                      key={`${keyword.category}-${keyword.keyword}-${index}`}
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${categoryColor} transition-colors duration-150`}
                      title={`Match confidence: ${formatConfidence(keyword.confidence)}`}
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
          {/* Café Cards */}
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
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => navigate(`/restaurant/${cafe.id}`)}
                >
                  <div className="flex">
                    <div className="w-48 h-48 flex-shrink-0">
                      <img
                        src={
                          cafe.metadata.photos?.[0] ||
                          cafe.photos?.[0] ||
                          '/default-cafe.jpg'
                        }
                        alt={cafe.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-semibold text-coffee-800">
                          {cafe.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500">★</span>
                          <span>
                            {Number(
                              cafe.metadata.rating || cafe.rating
                            ).toFixed(2)}
                          </span>
                          <span className="text-gray-500">
                            ({cafe.metadata.reviewCount || cafe.numOfRatings})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>{cafe.distance?.toFixed(1)} mi</span>
                        <span className="text-green-600">
                          {cafe.status || 'Open'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(cafe.metadata.keywords || cafe.keywords)
                          ?.slice(0, 3)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                      {cafe.matchingKeywords &&
                        cafe.matchingKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {cafe.matchingKeywords.map((match, idx) => {
                              const categoryColor = getCategoryColor(
                                match.category,
                                match.confidence
                              );
                              return (
                                <div
                                  key={`${match.category}-${match.keyword}-${idx}`}
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${categoryColor}`}
                                  title={`Match confidence: ${formatConfidence(match.confidence)}`}
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
