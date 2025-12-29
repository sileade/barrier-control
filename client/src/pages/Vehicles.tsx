import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Car, Search } from "lucide-react";
import type { Vehicle } from "../../../drizzle/schema";

type VehicleFormData = {
  licensePlate: string;
  ownerName: string;
  ownerPhone: string;
  vehicleModel: string;
  vehicleColor: string;
  notes: string;
};

const initialFormData: VehicleFormData = {
  licensePlate: "",
  ownerName: "",
  ownerPhone: "",
  vehicleModel: "",
  vehicleColor: "",
  notes: "",
};

export default function Vehicles() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);

  const { data: vehicles, isLoading } = trpc.vehicles.list.useQuery({ includeInactive: isAdmin });

  const createMutation = trpc.vehicles.create.useMutation({
    onSuccess: () => {
      toast.success("Vehicle added successfully");
      utils.vehicles.list.invalidate();
      setIsAddDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add vehicle");
    },
  });

  const updateMutation = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("Vehicle updated successfully");
      utils.vehicles.list.invalidate();
      setIsEditDialogOpen(false);
      setSelectedVehicle(null);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update vehicle");
    },
  });

  const deleteMutation = trpc.vehicles.delete.useMutation({
    onSuccess: () => {
      toast.success("Vehicle removed successfully");
      utils.vehicles.list.invalidate();
      setIsDeleteDialogOpen(false);
      setSelectedVehicle(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove vehicle");
    },
  });

  const filteredVehicles = vehicles?.filter(
    (v) =>
      v.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vehicleModel?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      licensePlate: vehicle.licensePlate,
      ownerName: vehicle.ownerName || "",
      ownerPhone: vehicle.ownerPhone || "",
      vehicleModel: vehicle.vehicleModel || "",
      vehicleColor: vehicle.vehicleColor || "",
      notes: vehicle.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, ...formData });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedVehicle) {
      deleteMutation.mutate({ id: selectedVehicle.id });
    }
  };

  const VehicleForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="licensePlate">License Plate *</Label>
          <Input
            id="licensePlate"
            value={formData.licensePlate}
            onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
            placeholder="A123BC777"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerName">Owner Name</Label>
          <Input
            id="ownerName"
            value={formData.ownerName}
            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerPhone">Phone</Label>
          <Input
            id="ownerPhone"
            value={formData.ownerPhone}
            onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
            placeholder="+7 999 123 4567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleModel">Vehicle Model</Label>
          <Input
            id="vehicleModel"
            value={formData.vehicleModel}
            onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
            placeholder="Toyota Camry"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleColor">Color</Label>
          <Input
            id="vehicleColor"
            value={formData.vehicleColor}
            onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
            placeholder="Black"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional information..."
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {isEdit ? "Save Changes" : "Add Vehicle"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">Manage allowed vehicle license plates</p>
        </div>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormData(initialFormData)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Add a new vehicle to the allowed list. The license plate will be automatically formatted.
                </DialogDescription>
              </DialogHeader>
              <VehicleForm onSubmit={handleSubmitAdd} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Registered Vehicles
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredVehicles && filteredVehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-bold">{vehicle.licensePlate}</TableCell>
                    <TableCell>
                      <div>
                        <p>{vehicle.ownerName || "-"}</p>
                        {vehicle.ownerPhone && (
                          <p className="text-xs text-muted-foreground">{vehicle.ownerPhone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{vehicle.vehicleModel || "-"}</p>
                        {vehicle.vehicleColor && (
                          <p className="text-xs text-muted-foreground">{vehicle.vehicleColor}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                        {vehicle.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(vehicle)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(vehicle)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No vehicles match your search" : "No vehicles registered yet"}
              </p>
              {isAdmin && !searchQuery && (
                <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Vehicle
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>Update vehicle information.</DialogDescription>
          </DialogHeader>
          <VehicleForm onSubmit={handleSubmitEdit} isEdit />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{selectedVehicle?.licensePlate}</strong> from the allowed list.
              The vehicle will no longer be able to pass automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
