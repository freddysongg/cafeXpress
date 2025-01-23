import React from "react";
import { Search } from "lucide-react";

const SearchBar = () => {
  return (
    <div className="w-full max-w-2xl animate-fade-in-delay">
      <div className="relative">
        <input
          type="text"
          placeholder="Search for cafés, coffee shops, or tea houses..."
          className="w-full px-6 py-4 pl-14 rounded-full bg-gray-200 text-black placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all duration-300"
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-500" />
      </div>
    </div>
  );
};

export default SearchBar;
