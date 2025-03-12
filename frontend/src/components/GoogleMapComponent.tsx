import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { useState, useEffect, useRef } from "react";

const containerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "8px",
};

interface MapProps {
  lat?: number;
  lng?: number;
}

const GoogleMapComponent: React.FC<MapProps> = ({ lat, lng }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_ID; // Map ID from your environment variable

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: lat || 32.7157, // Default to San Diego
    lng: lng || -117.1611,
  });

  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (lat && lng) {
      setMapCenter({ lat, lng });
    }
  }, [lat, lng]);

  const handleLoad = (map: google.maps.Map) => {
    // Set mapId and disable map type control and street view
    map.setOptions({
      mapId: mapId, // Use the Map ID from your environment variable
      mapTypeControl: false, // Removes Map/Satellite toggle
      streetViewControl: false, // Removes Street View mode
    });

    if (lat && lng) {
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: new google.maps.LatLng(lat, lng),
        map: map,
      });
    } else {
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: new google.maps.LatLng(32.7157, -117.1611), // Default to San Diego
        map: map,
      });
    }
  };

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={["marker"]}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={15}
        onLoad={handleLoad}
      />
    </LoadScript>
  );
};

export default GoogleMapComponent;
