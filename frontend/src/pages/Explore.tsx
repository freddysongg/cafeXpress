import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '../components/ui/button';
import { ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import CafeCard from '../components/CafeCard';

const DEFAULT_CAFES = [
  {
    id: '1',
    name: 'The Coffee House',
    description: 'vibey coffee house',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94110',
    createdAt: '2025-02-05T00:01:53.511Z',
  },
];

const DUMMY_CAFES = [
  {
    id: 1,
    name: 'The Coffee House',
    image:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80',
    rating: 4.5,
    reviews: 128,
    distance: '0.3',
    address: '123 Coffee Street',
    isOpen: true,
    tags: ['Coffee', 'Breakfast', 'Wifi'],
  },
  {
    id: 2,
    name: 'Brew & Bake',
    image:
      'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80',
    rating: 4.8,
    reviews: 256,
    distance: '0.7',
    address: '456 Baker Avenue',
    isOpen: true,
    tags: ['Coffee', 'Bakery', 'Brunch'],
  },
  {
    id: 3,
    name: 'The Tea Garden',
    image:
      'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80',
    rating: 4.3,
    reviews: 89,
    distance: '1.2',
    address: '789 Tea Lane',
    isOpen: false,
    tags: ['Tea', 'Pastries', 'Quiet'],
  },
];

const filterOptions = {
  distance: ['5 miles', '10 miles', '15 miles', '20 miles'],
  ambiance: ['Cozy', 'Modern', 'Quiet', 'Lively'],
  dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'],
  availability: ['Open Now', 'Opens at 9 AM', 'Closes at 5 PM'],
};

function Explore() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [, setMap] = useState<google.maps.Map | null>(null);
  const [, setCafes] = useState<
    {
      id: string;
      name: string;
      description: string | null;
      city: string;
      state: string;
      zipCode: string;
      createdAt: string;
    }[]
  >([]);
  const [, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: 'AIzaSyCsQUZzKQn5yfyWqPVep13mRKTGbL86fH0',
        version: 'weekly',
      });

      const google = await loader.load();

      if (mapRef.current) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 13,
        });

        setMap(newMap);

        DUMMY_CAFES.forEach((cafe) => {
          new google.maps.Marker({
            position: {
              lat: 40.7128 + Math.random() * 0.02,
              lng: -74.006 + Math.random() * 0.02,
            },
            map: newMap,
            title: cafe.name,
          });
        });
      }
    };

    const fetchCafes = async () => {
      try {
        const response = await fetch('http://localhost:8000/cafe/all');
        const data = await response.json();
        if (data.status === 'success' && data.data.length > 0) {
          setCafes(data.data);
        } else {
          setCafes(DEFAULT_CAFES);
        }
      } catch (error) {
        console.error('Error fetching cafés:', error);
        setCafes(DEFAULT_CAFES);
      } finally {
        setLoading(false);
      }
    };

    fetchCafes();
    initMap();
  }, []);

  const handleFilterSelect = (category: string, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const FilterButton = ({ category }: { category: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-white text-black font-medium hover:bg-gray-100 capitalize flex items-center gap-2"
        >
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
      <div ref={mapRef} className="w-1/2 h-full" />
      {/* Cafés List Section */}
      <div className="w-1/2 h-full overflow-y-auto bg-coffee-50 p-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-coffee-800">
            Nearby Cafés
          </h2>
          {/* Filter Buttons */}
          <div className="flex gap-4 mb-6">
            <FilterButton category="distance" />
            <FilterButton category="ambiance" />
            <FilterButton category="dietary" />
            <FilterButton category="availability" />
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
          {/* Café Cards */}
          <div className="space-y-6">
            {DUMMY_CAFES.map((cafe) => (
              <CafeCard key={cafe.id} cafe={cafe} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default Explore;
