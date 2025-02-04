// AIzaSyCsQUZzKQn5yfyWqPVep13mRKTGbL86fH0
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import CafeCard from '../components/CafeCard';

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

function Explore() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: 'AIzaSyCsQUZzKQn5yfyWqPVep13mRKTGbL86fH0', // Replace with your API key
        version: 'weekly',
      });

      const google = await loader.load();

      if (mapRef.current) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.006 }, // New York coordinates
          zoom: 13,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ color: '#FAF7F2' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#E8D6C0' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#D4B494' }],
            },
            {
              featureType: 'road.arterial',
              elementType: 'geometry',
              stylers: [{ color: '#C09268' }],
            },
            {
              featureType: 'poi',
              elementType: 'geometry',
              stylers: [{ color: '#AB703C' }],
            },
            {
              featureType: 'transit',
              elementType: 'geometry',
              stylers: [{ color: '#8B5E2F' }],
            },
          ],
        });

        setMap(newMap);

        // Add markers for each café
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

    initMap();
  }, []);

  return (
    <div className="flex h-screen pt-16">
      {/* Map Section */}
      <div ref={mapRef} className="w-1/2 h-full" />

      {/* Cafés List Section */}
      <div className="w-1/2 h-full overflow-y-auto bg-coffee-50 p-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-coffee-800">
            Results
          </h2>

          {/* Filters */}
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            <button className="btn-filter">Open Now</button>
            <button className="btn-filter">Top Rated</button>
            <button className="btn-filter">Distance</button>
            <button className="btn-filter">Price</button>
          </div>

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
