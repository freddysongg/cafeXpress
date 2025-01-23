import React from "react";
import { Star, Clock, MapPin } from "lucide-react";

interface CafeProps {
  cafe: {
    id: number;
    name: string;
    image: string;
    rating: number;
    reviews: number;
    distance: string;
    address: string;
    isOpen: boolean;
    tags: string[];
  };
}

const CafeCard: React.FC<CafeProps> = ({ cafe }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-coffee-100">
      <div className="flex">
        {/* Café Image */}
        <div className="w-1/3">
          <img
            src={cafe.image}
            alt={cafe.name}
            className="w-full h-full object-cover"
            style={{ height: "160px" }}
          />
        </div>

        {/* Café Information */}
        <div className="w-2/3 p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-coffee-800">
              {cafe.name}
            </h3>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-coffee-400 fill-current" />
              <span className="ml-1 text-sm text-coffee-600">
                {cafe.rating}
              </span>
              <span className="ml-1 text-sm text-coffee-400">
                ({cafe.reviews})
              </span>
            </div>
          </div>

          <div className="flex items-center text-sm text-coffee-500 mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{cafe.address}</span>
            <span className="mx-2">•</span>
            <span>{cafe.distance} mi</span>
          </div>

          <div className="flex items-center mb-3">
            <Clock className="w-4 h-4 mr-1" />
            <span
              className={`text-sm ${cafe.isOpen ? "text-green-600" : "text-red-500"}`}
            >
              {cafe.isOpen ? "Open Now" : "Closed"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {cafe.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-coffee-50 text-coffee-600 rounded-full border border-coffee-100"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeCard;
