import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";

const Profile = () => {
  return (
    <div className="min-h-screen pb-20">
      <div className="bg-primary text-primary-foreground p-6 pt-12">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Button variant="ghost" size="icon" className="text-primary-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-2xl font-semibold">JD</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">John Doe</h2>
            <p className="opacity-90">Coffee enthusiast</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">Cafés visited</p>
            <p className="text-2xl font-bold">12</p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">Reviews</p>
            <p className="text-2xl font-bold">8</p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">Favorite drink</p>
            <p className="text-lg font-semibold">Cappuccino</p>
          </Card>
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">Member since</p>
            <p className="text-lg font-semibold">2024</p>
          </Card>
        </div>
      </div>
      
      <Navbar />
    </div>
  );
};

export default Profile;