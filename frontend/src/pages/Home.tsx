import SearchBar from '../components/SearchBar';

function Home() {
  return (
    <div className="relative h-screen">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
      </div>

      {/* Hero Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 -mt-28 text-center animate-fade-in">
          Discover Your Next Favorite Café
        </h1>
        <p className="text-xl text-white/90 mb-8 text-center max-w-2xl animate-fade-in-delay">
          Find and explore the best local cafés in your area
        </p>
        <SearchBar />
      </div>
    </div>
  );
}

export default Home;
