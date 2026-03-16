import { Building2, Mail, Phone, MapPin } from "lucide-react";
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
    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200" onClick={() => onViewDetails(supplier)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600" />
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
              <Mail className="h-4 w-4" />
              <span className="truncate">{supplier.contactEmail}</span>
            </div>
          )}
          {supplier.contactPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{supplier.contactPhone}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{supplier.address}</span>
            </div>
          )}
        </div>
        <Button className="w-full mt-4 bg-green-600 hover:bg-green-700" onClick={(e) => {
          e.stopPropagation();
          onViewDetails(supplier);
        }}>
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
