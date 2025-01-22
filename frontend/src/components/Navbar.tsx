import { Coffee, MapPin, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-6 flex justify-around items-center z-50">
      <Link 
        to="/" 
        className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <Coffee className="w-6 h-6" />
        <span className="text-xs">Home</span>
      </Link>
      
      <Link 
        to="/explore" 
        className={`flex flex-col items-center gap-1 ${isActive('/explore') ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <MapPin className="w-6 h-6" />
        <span className="text-xs">Explore</span>
      </Link>
      
      <Link 
        to="/profile" 
        className={`flex flex-col items-center gap-1 ${isActive('/profile') ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <UserRound className="w-6 h-6" />
        <span className="text-xs">Profile</span>
      </Link>
    </nav>
  );
};

export default Navbar;