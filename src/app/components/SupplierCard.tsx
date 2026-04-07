import { Building2, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface Supplier {
  id: string;
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

interface SupplierCardProps {
  supplier: Supplier;
  onViewDetails: (supplier: Supplier) => void;
}

export function SupplierCard({ supplier, onViewDetails }: SupplierCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer border-green-200 border-t-4 border-t-yellow-400 group"
      onClick={() => onViewDetails(supplier)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-200 group-hover:bg-yellow-200 transition-colors">
              <Building2 className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <CardDescription className="line-clamp-1">{supplier.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {supplier.contactEmail && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 text-yellow-500" />
              <span className="truncate">{supplier.contactEmail}</span>
            </div>
          )}
          {supplier.contactPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 text-yellow-500" />
              <span>{supplier.contactPhone}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 text-yellow-500" />
              <span className="truncate">{supplier.address}</span>
            </div>
          )}
        </div>
        <Button
          className="w-full mt-4 bg-green-600 hover:bg-green-700 group-hover:bg-yellow-400 group-hover:text-green-900 transition-colors font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(supplier);
          }}
        >
          View Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}