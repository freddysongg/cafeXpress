import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { ChevronDown } from 'lucide-react';
import CafeCard from '../components/CafeCard';

const DUMMY_CAFES = [
  {
    id: 1,
    name: "The Coffee House",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80",
    rating: 4.5,
    reviews: 128,
    distance: "0.3",
    address: "123 Coffee Street",
    isOpen: true,
    tags: ["Coffee", "Breakfast", "Wifi"]
  },
  {
    id: 2,
    name: "Brew & Bake",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80",
    rating: 4.8,
    reviews: 256,
    distance: "0.7",
    address: "456 Baker Avenue",
    isOpen: true,
    tags: ["Coffee", "Bakery", "Brunch"]
  },
  {
    id: 3,
    name: "The Tea Garden",
    image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80",
    rating: 4.3,
    reviews: 89,
    distance: "1.2",
    address: "789 Tea Lane",
    isOpen: false,
    tags: ["Tea", "Pastries", "Quiet"]
  }
];

interface FilterOption {
  label: string;
  value: string;
}

const distanceOptions: FilterOption[] = [
  { label: "Within 5 miles", value: "5" },
  { label: "Within 10 miles", value: "10" },
  { label: "Within 15 miles", value: "15" },
  { label: "Within 20 miles", value: "20" },
];

const ambianceOptions: FilterOption[] = [
  { label: "Quiet & Cozy", value: "quiet" },
  { label: "Bustling & Lively", value: "lively" },
  { label: "Modern & Sleek", value: "modern" },
  { label: "Rustic & Warm", value: "rustic" },
  { label: "Study-friendly", value: "study" },
];

const dietaryOptions: FilterOption[] = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Gluten-free", value: "gluten-free" },
  { label: "Dairy-free", value: "dairy-free" },
];

const availabilityOptions: FilterOption[] = [
  { label: "Open Now", value: "open" },
  { label: "Open Early (Before 7 AM)", value: "early" },
  { label: "Open Late (After 8 PM)", value: "late" },
  { label: "Open 24/7", value: "24h" },
];

// Type-safe filter options mapping
const filterOptionsMap: Record<string, FilterOption[]> = {
  distance: distanceOptions,
  ambiance: ambianceOptions,
  dietary: dietaryOptions,
  availability: availabilityOptions,
};

function Explore() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [, setMap] = useState<google.maps.Map | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState({
    distance: "",
    ambiance: "",
    dietary: "",
    availability: "",
  });

  const handleFilterClick = (filterName: string) => {
    setActiveFilter(prev => (prev === filterName ? null : filterName));
  };

  const handleOptionSelect = (filterName: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setActiveFilter(null);
  };

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: 'AIzaSyCsQUZzKQn5yfyWqPVep13mRKTGbL86fH0',
        version: 'weekly',
      });

      const google = await loader.load();
      
      if (mapRef.current) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.0060 },
          zoom: 13
        });

        setMap(newMap);

        DUMMY_CAFES.forEach(cafe => {
          new google.maps.Marker({
            position: { lat: 40.7128 + Math.random() * 0.02, lng: -74.0060 + Math.random() * 0.02 },
            map: newMap,
            title: cafe.name
          });
        });
      }
    };

    initMap();
    console.log("Updated activeFilter:", activeFilter);
  }, [activeFilter]);

  const FilterDropdown = ({ options, filterName, activeFilter, onSelect }: {
    options: FilterOption[];
    filterName: string;
    activeFilter: string | null;
    onSelect: (value: string) => void;
  }) => (
    <div className="relative">
      <button
        onClick={() => handleFilterClick(filterName)}
        className={`btn-filter flex items-center gap-2 px-4 py-2 rounded-lg border border-coffee-200 ${
          selectedFilters[filterName as keyof typeof selectedFilters]
            ? 'bg-coffee-100 text-coffee-800'
            : 'bg-white text-coffee-600'
        }`}
      >
        {filterName.charAt(0).toUpperCase() + filterName.slice(1)}
        <ChevronDown className={`w-4 h-4 transition-transform ${
          activeFilter === filterName ? 'transform rotate-180' : ''
        }`} />
      </button>
      
      {activeFilter === filterName && (
          <div
            className="absolute z-50 mt-2 py-2 w-48 bg-white rounded-lg shadow-lg border border-coffee-100"
            style={{ display: "block", opacity: 1, visibility: "visible" }} // Forces it to be visible
          >
            {options.map((option) => (
              <button key={option.value} onClick={() => onSelect(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        )}
    </div>
  );

  return (
    <div className="flex h-screen pt-16">
      {/* Map Section */}
      <div ref={mapRef} className="w-1/2 h-full" />

      {/* Cafés List Section */}
      <div className="w-1/2 h-full overflow-y-auto bg-coffee-50 p-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-coffee-800">Nearby Cafés</h2>
          
          {/* Filters */}
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            <FilterDropdown
              options={distanceOptions}
              filterName="distance"
              activeFilter={activeFilter}
              onSelect={(value) => handleOptionSelect('distance', value)}
            />
            <FilterDropdown
              options={ambianceOptions}
              filterName="ambiance"
              activeFilter={activeFilter}
              onSelect={(value) => handleOptionSelect('ambiance', value)}
            />
            <FilterDropdown
              options={dietaryOptions}
              filterName="dietary"
              activeFilter={activeFilter}
              onSelect={(value) => handleOptionSelect('dietary', value)}
            />
            <FilterDropdown
              options={availabilityOptions}
              filterName="availability"
              activeFilter={activeFilter}
              onSelect={(value) => handleOptionSelect('availability', value)}
            />
          </div>

          {/* Active Filters */}
          {Object.entries(selectedFilters).some(([_, value]) => value) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(selectedFilters).map(([key, value]) => {
                if (!value) return null;
                
                const options = filterOptionsMap[key];
                const option = options?.find(opt => opt.value === value);
                
                return option ? (
                  <div
                    key={key}
                    className="bg-coffee-100 text-coffee-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {option.label}
                    <button
                      onClick={() => handleOptionSelect(key, '')}
                      className="hover:text-coffee-600"
                    >
                      ×
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Café Cards */}
          <div className="space-y-6">
            {DUMMY_CAFES.map(cafe => (
              <CafeCard key={cafe.id} cafe={cafe} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Explore;