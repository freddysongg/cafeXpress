import { Coffee, Heart, MapPin } from "lucide-react";
import SearchBar from "../components/SearchBar";

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
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 text-center animate-fade-in">
          Discover Your Next Favorite Café
        </h1>
        <p className="text-xl text-white/90 mb-8 text-center max-w-2xl animate-fade-in-delay">
          Find and explore the best local cafés in your area
        </p>
        <SearchBar />

        {/* Featured Categories */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full animate-fade-in-delay-2">
          <CategoryCard icon={Coffee} title="Coffee Shops" count="250+" />
          <CategoryCard icon={Heart} title="Tea Houses" count="120+" />
          <CategoryCard icon={MapPin} title="Near You" count="50+" />
          <CategoryCard icon={Coffee} title="Bakeries" count="180+" />
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  icon: Icon,
  title,
  count,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  title: string;
  count: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-white hover:bg-white/20 transition-all duration-300 cursor-pointer group">
      <div className="flex flex-col items-center text-center">
        <Icon className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm opacity-80">{count}</p>
      </div>
    </div>
  );
}

export default Home;
