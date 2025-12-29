import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Search, FileText, UserCheck, UserX, Clock, HelpCircle } from "lucide-react";
import type { MedicalRecord } from "../../../drizzle/schema";

type MedicalFormData = {
  licensePlate: string;
  driverName: string;
  driverPhone: string;
  medicalStatus: "valid" | "expired" | "suspended" | "unknown";
  expirationDate: string;
  notes: string;
};

const initialFormData: MedicalFormData = {
  licensePlate: "",
  driverName: "",
  driverPhone: "",
  medicalStatus: "unknown",
  expirationDate: "",
  notes: "",
};

const statusConfig = {
  valid: { label: "Valid", icon: UserCheck, color: "text-green-500 bg-green-500/10 border-green-500/20" },
  expired: { label: "Expired", icon: Clock, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  suspended: { label: "Suspended", icon: UserX, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  unknown: { label: "Unknown", icon: HelpCircle, color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
};

export default function MedicalRecords() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [formData, setFormData] = useState<MedicalFormData>(initialFormData);

  const { data: records, isLoading } = trpc.medical.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  const upsertMutation = trpc.medical.upsert.useMutation({
    onSuccess: () => {
      toast.success(selectedRecord ? "Record updated successfully" : "Record added successfully");
      utils.medical.list.invalidate();
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setSelectedRecord(null);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save record");
    },
  });

  const deleteMutation = trpc.medical.delete.useMutation({
    onSuccess: () => {
      toast.success("Record deleted successfully");
      utils.medical.list.invalidate();
      setIsDeleteDialogOpen(false);
      setSelectedRecord(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete record");
    },
  });

  const filteredRecords = records?.filter(
    (r) =>
      r.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setFormData({
      licensePlate: record.licensePlate,
      driverName: record.driverName,
      driverPhone: record.driverPhone || "",
      medicalStatus: record.medicalStatus,
      expirationDate: record.expirationDate ? new Date(record.expirationDate).toISOString().split("T")[0] : "",
      notes: record.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate({
      ...formData,
      expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : undefined,
    });
  };

  const handleConfirmDelete = () => {
    if (selectedRecord) {
      deleteMutation.mutate({ id: selectedRecord.id });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access medical records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const MedicalForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label htmlFor="driverName">Driver Name *</Label>
          <Input
            id="driverName"
            value={formData.driverName}
            onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
            placeholder="John Doe"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driverPhone">Phone</Label>
          <Input
            id="driverPhone"
            value={formData.driverPhone}
            onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
            placeholder="+7 999 123 4567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="medicalStatus">Medical Status</Label>
          <Select
            value={formData.medicalStatus}
            onValueChange={(v) => setFormData({ ...formData, medicalStatus: v as MedicalFormData["medicalStatus"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="expirationDate">Expiration Date</Label>
          <Input
            id="expirationDate"
            type="date"
            value={formData.expirationDate}
            onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
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
        <Button type="submit" disabled={upsertMutation.isPending}>
          {selectedRecord ? "Save Changes" : "Add Record"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground">Manage driver medical information</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setSelectedRecord(null); setFormData(initialFormData); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Medical Record</DialogTitle>
              <DialogDescription>
                Add a new driver medical record to the database.
              </DialogDescription>
            </DialogHeader>
            <MedicalForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Medical Database
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
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
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const status = statusConfig[record.medicalStatus];
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono font-bold">{record.licensePlate}</TableCell>
                      <TableCell>{record.driverName}</TableCell>
                      <TableCell>{record.driverPhone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.expirationDate 
                          ? new Date(record.expirationDate).toLocaleDateString("ru-RU")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(record)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No records match your search" : "No medical records yet"}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Record
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
            <DialogTitle>Edit Medical Record</DialogTitle>
            <DialogDescription>Update driver medical information.</DialogDescription>
          </DialogHeader>
          <MedicalForm />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the medical record for{" "}
              <strong>{selectedRecord?.driverName}</strong> ({selectedRecord?.licensePlate}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
