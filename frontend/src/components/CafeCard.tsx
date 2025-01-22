import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CafeCardProps {
  name: string;
  description: string;
  rating: number;
  image: string;
}

const CafeCard = ({ name, description, rating, image }: CafeCardProps) => {
  return (
    <Card className="card-hover overflow-hidden">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="object-cover w-full h-full"
        />
      </div>
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg">{name}</h3>
          <span className="bg-secondary px-2 py-1 rounded-full text-sm">
            ★ {rating}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
};

export default CafeCard;