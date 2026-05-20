import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2, Home, Briefcase, Compass, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

export function ProfileAddresses() {
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("Home");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");

  // 1. Fetch user addresses
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses", "me"],
    queryFn: () => apiRequest<any[]>("/api/v1/addresses", { method: "GET" }),
  });

  // 2. Add mutation
  const addAddress = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/v1/addresses", {
        method: "POST",
        body: { title, address_line: addressLine, landmark: landmark || undefined },
      });
    },
    onSuccess: () => {
      toast.success("Address added to your profile");
      setIsAdding(false);
      setAddressLine("");
      setLandmark("");
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    },
    onError: () => toast.error("Failed to save address"),
  });

  // 3. Set default mutation
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/v1/addresses/${id}/default`, { method: "PUT" });
    },
    onSuccess: () => {
      toast.success("Default delivery destination updated");
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    },
  });

  // 4. Delete mutation
  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/v1/addresses/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Address profile removed");
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    },
    onError: () => toast.error("Could not delete address"),
  });

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "home": return <Home className="h-4 w-4" />;
      case "office":
      case "work": return <Briefcase className="h-4 w-4" />;
      default: return <Compass className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-border/60 shadow-sm rounded-xl overflow-hidden mt-6">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm tracking-tight text-foreground">Saved Delivery Addresses</h3>
          </div>
          {!isAdding && (
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)} className="h-8 rounded-xl text-xs gap-1">
              <Plus className="h-3 w-3" /> Add New
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse py-4">Loading address list...</p>
        ) : addresses.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
            No saved delivery locations found. Add an address to speed up checkout.
          </div>
        ) : (
          <div className="grid gap-3">
            {!isAdding && addresses.map((addr: any) => (
              <div 
                key={addr.id}
                className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                  addr.is_default ? "bg-primary/5 border-primary/40" : "bg-card/50 border-border/80"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${addr.is_default ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {getIcon(addr.title)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">{addr.title}</span>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Primary Destination
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/90 font-medium leading-relaxed break-words">{addr.address_line}</p>
                  {addr.landmark && <p className="text-[11px] text-muted-foreground">Landmark: {addr.landmark}</p>}
                  
                  {!addr.is_default && (
                    <div className="pt-1.5 flex gap-3">
                      <button 
                        onClick={() => setDefault.mutate(addr.id)}
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        Set as primary
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    if(confirm("Remove this address permanently?")) deleteAddress.mutate(addr.id);
                  }}
                  className="text-muted-foreground/60 hover:text-destructive p-1 rounded transition-colors self-start"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic New Address Input Sub-Module */}
        {isAdding && (
          <div className="border border-border p-4 rounded-xl bg-muted/20 space-y-3 animate-in fade-in duration-200">
            <p className="text-xs font-bold text-foreground">New Address Particulars</p>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Label Tag</Label>
                <div className="flex gap-2 mt-1">
                  {["Home", "Office", "Other"].map((tag) => (
                    <Button 
                      key={tag} 
                      type="button"
                      size="sm"
                      variant={title === tag ? "default" : "outline"}
                      onClick={() => setTitle(tag)}
                      className="h-7 text-xs rounded-lg px-3"
                    >
                      {tag}
                    </Button>
                  ))}
                  {title !== "Home" && title !== "Office" && title !== "Other" && (
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-xs max-w-[120px]" />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Full Delivery Address</Label>
                <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="h-9 rounded-lg mt-1 text-xs" placeholder="Flat/House No, Building, Street Name..." />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Nearby Landmark (Optional)</Label>
                <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} className="h-9 rounded-lg mt-1 text-xs" placeholder="Opposite, behind, next to..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 text-xs rounded-lg">Cancel</Button>
              <Button 
                type="button" 
                disabled={!addressLine || addAddress.isPending}
                onClick={() => addAddress.mutate()} 
                className="h-8 text-xs rounded-lg font-semibold px-4"
              >
                Save Location
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}