import { GoogleMap, useJsApiLoader, Libraries } from '@react-google-maps/api';
import { useState, useEffect, useRef } from 'react';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px',
};

interface MapProps {
  lat?: number;
  lng?: number;
}

// Define libraries at the module level to prevent unnecessary re-renders
const libraries: Libraries = ['marker'];

const GoogleMapComponent: React.FC<MapProps> = ({ lat, lng }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_ID;

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: lat || 32.7157, // Default to San Diego
    lng: lng || -117.1611,
  });

  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Use the useJsApiLoader hook to load the Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
    version: 'beta' // For advanced markers
  });

  useEffect(() => {
    if (lat && lng) {
      setMapCenter({ lat, lng });
      
      // Update marker position if map is already loaded
      if (mapRef.current && markerRef.current) {
        markerRef.current.position = new google.maps.LatLng(lat, lng);
      }
    }
  }, [lat, lng]);

  const handleLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    
    // Set map options
    map.setOptions({
      mapId: mapId,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      scrollwheel: false
    });

    // Create marker only if coordinates are available
    if (lat && lng && google.maps.marker) {
      try {
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          position: new google.maps.LatLng(lat, lng),
          map: map,
        });
      } catch (error) {
        console.error("Error creating advanced marker:", error);
        // Fallback to standard marker if advanced marker fails
        new google.maps.Marker({
          position: new google.maps.LatLng(lat, lng),
          map: map,
        });
      }
    }
  };

  const handleUnmount = () => {
    mapRef.current = null;
    markerRef.current = null;
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-4">
          <p className="text-red-600 font-medium">Error loading map</p>
          <p className="text-sm text-gray-600 mt-1">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={15}
      onLoad={handleLoad}
      onUnmount={handleUnmount}
      options={{
        mapId: mapId,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        scrollwheel: false
      }}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-700 mb-2 mx-auto"></div>
        <p className="text-coffee-800 text-sm font-medium">Loading Map...</p>
      </div>
    </div>
  );
};

export default GoogleMapComponent;
