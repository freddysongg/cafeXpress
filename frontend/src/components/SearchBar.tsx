import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

const SearchBar = ({
  className = '',
  onSearch,
  placeholder = 'Search for cafés, coffee shops, or tea houses...',
}: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (onSearch) {
        onSearch(query);
      } else {
        // If no onSearch prop is provided, navigate to explore page with search query
        navigate(`/explore?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <div className={`w-full max-w-2xl animate-fade-in-delay ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-6 py-4 pl-14 rounded-full bg-gray-200 text-black placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-300"
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-500" />
      </div>
    </div>
  );
};

export default SearchBar;
