import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  History, 
  Search, 
  Shield, 
  ShieldAlert, 
  Image as ImageIcon,
  Filter,
  Download
} from "lucide-react";

export default function Passages() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const { data: passages, isLoading } = trpc.passages.list.useQuery({
    limit,
    isAllowed: statusFilter === "all" ? undefined : statusFilter === "allowed",
  });

  const filteredPassages = passages?.filter(
    (p) =>
      p.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.recognizedPlate?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    if (!filteredPassages) return;
    
    const headers = ["Date/Time", "License Plate", "Recognized", "Confidence", "Status", "Manual"];
    const rows = filteredPassages.map((p) => [
      new Date(p.timestamp).toLocaleString("ru-RU"),
      p.licensePlate,
      p.recognizedPlate || "-",
      p.confidence ? `${p.confidence}%` : "-",
      p.isAllowed ? "Allowed" : "Denied",
      p.wasManualOpen ? "Yes" : "No",
    ]);
    
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passages-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Passage History</h1>
          <p className="text-muted-foreground">View all vehicle passage records</p>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={!filteredPassages?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Passage Logs
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search plates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="allowed">Allowed</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredPassages && filteredPassages.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Recognized</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Photo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPassages.map((passage) => (
                    <TableRow key={passage.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(passage.timestamp).toLocaleString("ru-RU")}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {passage.licensePlate}
                      </TableCell>
                      <TableCell className="font-mono">
                        {passage.recognizedPlate || "-"}
                      </TableCell>
                      <TableCell>
                        {passage.confidence ? (
                          <Badge 
                            variant="outline" 
                            className={
                              passage.confidence >= 80 
                                ? "border-green-500 text-green-500" 
                                : passage.confidence >= 50 
                                  ? "border-yellow-500 text-yellow-500"
                                  : "border-red-500 text-red-500"
                            }
                          >
                            {passage.confidence}%
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={passage.isAllowed ? "default" : "destructive"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {passage.isAllowed ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <ShieldAlert className="h-3 w-3" />
                          )}
                          {passage.isAllowed ? "Allowed" : "Denied"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {passage.wasManualOpen ? "Manual" : "Auto"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {passage.photoUrl ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedImage(passage.photoUrl)}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "No passages match your filters"
                  : "No passages recorded yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Passage Photo</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <img
                src={selectedImage}
                alt="Passage photo"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
