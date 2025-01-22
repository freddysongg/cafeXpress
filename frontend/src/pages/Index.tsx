import CafeCard from "@/components/CafeCard";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const FEATURED_CAFES = [
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
  }
];

const Index = () => {
  return (
    <div className="min-h-screen pb-20">
      <div className="hero-gradient text-white p-6 pt-12 pb-20 rounded-b-3xl">
        <h1 className="text-4xl font-bold mb-4">Find Your Perfect Brew</h1>
        <p className="text-lg opacity-90 mb-8">Discover cozy cafés near you</p>
        
        <div className="relative">
          <Input 
            placeholder="Search cafés..."
            className="w-full pl-12 bg-white/90 text-foreground"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      
      <div className="px-6 -mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Featured Cafés</h2>
          <Button variant="ghost" className="text-primary">See all</Button>
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {FEATURED_CAFES.map((cafe) => (
            <CafeCard key={cafe.name} {...cafe} />
          ))}
        </div>
      </div>
      
      <Navbar />
    </div>
  );
};

export default Index;