import CafeCard from "@/components/CafeCard";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const CAFES = [
  {
    name: "The Daily Grind",
    description: "Artisanal coffee & fresh pastries in a cozy setting",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-1.2.1&auto=format&fit=crop&w=2847&q=80"
  },
  {
    name: "Coffee & Clay",
    description: "Specialty coffee served in handmade ceramic cups",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80"
  },
  {
    name: "Brew & View",
    description: "Coffee with a view of the city skyline",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?ixlib=rb-1.2.1&auto=format&fit=crop&w=2857&q=80"
  },
  {
    name: "Bean Scene",
    description: "Modern café with an industrial vibe",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?ixlib=rb-1.2.1&auto=format&fit=crop&w=2851&q=80"
  }
];

const Explore = () => {
  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 bg-background z-10 p-6 border-b">
        <h1 className="text-2xl font-bold mb-4">Explore Cafés</h1>
        <div className="relative">
          <Input 
            placeholder="Search by name or location..."
            className="w-full pl-12"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      
      <div className="p-6 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {CAFES.map((cafe) => (
          <CafeCard key={cafe.name} {...cafe} />
        ))}
      </div>
      
      <Navbar />
    </div>
  );
};

export default Explore;