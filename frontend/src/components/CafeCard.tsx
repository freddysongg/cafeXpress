import { Star, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KeywordMatch } from '../services/api';

interface CafeCardProps {
  cafe: {
    id: string;
    name: string;
    image: string;
    rating: number;
    reviews: number;
    distance: string;
    address: string;
    isOpen: boolean;
    tags: string[];
    matchingKeywords?: KeywordMatch[];
  };
}

const CafeCard = ({ cafe }: CafeCardProps) => {
  console.log('Cafe data:', cafe);
  const navigate = useNavigate();

  const handleClick = () => {
    if (!cafe.id) {
      console.error('Error: Cafe ID is missing, cannot navigate.');
      return;
    }
    console.log(`Navigating to /restaurant/${cafe.id}`);
    navigate(`/restaurant/${cafe.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-coffee-100 cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="flex">
        {/* Café Image */}
        <div className="w-1/3">
          <img
            src={cafe.image || '/placeholder.jpg'}
            alt={cafe.name || 'Cafe image'}
            className="w-full h-full object-cover"
            style={{ height: '160px' }}
            onError={(e) => (e.currentTarget.src = '/placeholder.jpg')}
          />
        </div>

        {/* Café Information */}
        <div className="w-2/3 p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-coffee-800">
              {cafe.name || 'Unknown Café'}
            </h3>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-coffee-400 fill-current" />
              <span className="ml-1 text-sm text-coffee-600">
                {cafe.rating?.toFixed(1) || 'N/A'}
              </span>
              <span className="ml-1 text-sm text-coffee-400">
                ({cafe.reviews ?? 0})
              </span>
            </div>
          </div>

          <div className="flex items-center text-sm text-coffee-500 mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{cafe.address || 'Address not available'}</span>
            {cafe.distance && (
              <>
                <span className="mx-2">•</span>
                <span>{cafe.distance} mi</span>
              </>
            )}
          </div>

          <div className="flex items-center mb-3">
            <Clock className="w-4 h-4 mr-1" />
            <span
              className={`text-sm ${cafe.isOpen ? 'text-green-600' : 'text-red-500'}`}
            >
              {cafe.isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {cafe.tags.length > 0 ? (
              cafe.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-coffee-50 text-coffee-600 rounded-full border border-coffee-100"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-coffee-400">No tags available</span>
            )}
          </div>

          {/* Matching keywords section */}
          {cafe.matchingKeywords && cafe.matchingKeywords.length > 0 && (
            <div className="px-4 py-2 border-t">
              <div className="flex flex-wrap gap-2">
                {cafe.matchingKeywords.map((keyword, index) => (
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
                    <span className="ml-1 text-xs opacity-75">
                      {Math.round(keyword.confidence * 66.67)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CafeCard;
