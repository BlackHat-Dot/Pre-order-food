import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2, Home, Briefcase, Compass, CheckCircle2, Loader2, Search, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ProfileAddresses() {
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("Home");
  const [landmark, setLandmark] = useState("");
  
  // MAP ENFORCEMENT & VERIFICATION STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVerifiedAddress, setSelectedVerifiedAddress] = useState<string | null>(null);
  const [houseDetails, setHouseDetails] = useState("");

  // 1. Fetch user addresses
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses", "me"],
    queryFn: () => apiRequest<any[]>("/api/v1/addresses", { method: "GET" }),
  });

  // 🚀 MAX ADDRESS ENFORCEMENT CAP CHECK
  const isCapReached = addresses.length >= 3;

  const handleAddNewClick = () => {
    if (isCapReached) {
      // Graceful toast alert explanation if they somehow bypass the disabled look
      toast.warning("Address limit reached", {
        description: "You can save up to 3 delivery locations. Please remove an old address to add a new one.",
      });
      return;
    }
    setIsAdding(true);
  };

  // LIVE OPENSTREETMAP LOOKUP ENGINE
  useEffect(() => {
    if (searchQuery.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5`,
          { headers: { "User-Agent": "PreOrderFoodApp/1.0" } }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Map query rejected", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // 2. Add address profile mutation
  const addAddress = useMutation({
    mutationFn: async () => {
      const fullFinalLine = `${houseDetails.trim()}, ${selectedVerifiedAddress}`;
      return await apiRequest("/api/v1/addresses", {
        method: "POST",
        body: { title, address_line: fullFinalLine, landmark: landmark || undefined },
      });
    },
    onSuccess: () => {
      toast.success("Verified delivery profile saved!");
      setIsAdding(false);
      setSearchQuery("");
      setSelectedVerifiedAddress(null);
      setHouseDetails("");
      setLandmark("");
      setSuggestions([]);
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    },
    onError: () => toast.error("Failed to map coordinates safely."),
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
            <h3 className="font-bold text-sm tracking-tight text-foreground">
              Saved Delivery Addresses ({addresses.length}/3)
            </h3>
          </div>
          
          {/* 🚀 GRACEFUL INTERACTIVE CAP TOOLTIP ENFORCEMENT */}
          {!isAdding && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleAddNewClick} 
                      disabled={isCapReached}
                      className="h-8 rounded-xl text-xs gap-1 transition-all"
                    >
                      <Plus className="h-3 w-3" /> Add New
                    </Button>
                  </span>
                </TooltipTrigger>
                {isCapReached && (
                  <TooltipContent className="bg-popover border text-popover-foreground max-w-xs rounded-xl p-3 shadow-lg space-y-1">
                    <p className="text-xs font-bold flex items-center gap-1.5 text-amber-500">
                      <Info className="h-3.5 w-3.5" /> Profile Limit Reached
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      To safeguard account clarity, you can save a maximum of 3 unique locations. Please drop an older destination to save this profile.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse py-4 text-left">Loading address profiles...</p>
        ) : addresses.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
            No saved delivery locations found. Add an address to speed up checkout.
          </div>
        ) : (
          <div className="grid gap-3">
            {!isAdding && addresses.map((addr: any) => (
              <div 
                key={addr.id}
                className={`p-4 rounded-xl border flex items-start gap-3 transition-colors text-left ${
                  addr.is_default ? "bg-primary/5 border-primary/40" : "bg-card/50 border-border/80"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${addr.is_default ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {getIcon(addr.title)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
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

        {/* THE ENFORCED MAP INPUT MODULE */}
        {isAdding && !isCapReached && (
          <div className="border border-border p-4 rounded-xl bg-muted/20 space-y-4 animate-in fade-in duration-200 text-left">
            <p className="text-xs font-black tracking-wider text-primary uppercase">Verify Location Profile</p>
            
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] font-bold text-muted-foreground">Address Label</Label>
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
                </div>
              </div>

              <div className="space-y-1 relative">
                <Label className="text-[11px] font-bold text-muted-foreground">Search Area / Street / City</Label>
                <div className="relative mt-1">
                  <Input 
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedVerifiedAddress) setSelectedVerifiedAddress(null);
                    }}
                    className="h-10 rounded-xl pl-9 text-xs focus-visible:ring-primary" 
                    placeholder="Type area name (e.g. Polur, Chennai...)" 
                    disabled={!!selectedVerifiedAddress}
                  />
                  
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {isSearching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                  </div>
                  
                  {selectedVerifiedAddress && (
                    <button 
                      type="button"
                      onClick={() => { setSelectedVerifiedAddress(null); setSearchQuery(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-muted hover:bg-border px-2 py-0.5 rounded font-medium"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                {suggestions.length > 0 && !selectedVerifiedAddress && (
                  <div className="absolute z-30 w-full bg-popover border border-border mt-1 rounded-xl shadow-xl overflow-hidden max-h-[160px] overflow-y-auto divide-y divide-border">
                    {suggestions.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedVerifiedAddress(place.display_name);
                          setSearchQuery(place.display_name);
                          setSuggestions([]);
                        }}
                        className="p-3 text-xs text-foreground hover:bg-accent cursor-pointer transition-colors text-left font-medium flex items-start gap-2"
                      >
                        <MapPin className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                        <span>{place.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedVerifiedAddress ? (
                <div className="space-y-3 pt-2 border-t border-dashed border-border/80 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 rounded-xl p-3 text-xs font-semibold flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Map Match Confirmed: <span className="text-muted-foreground font-normal">{selectedVerifiedAddress}</span></span>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground">Flat / House / Door Number <span className="text-destructive">*</span></Label>
                    <Input 
                      value={houseDetails} 
                      onChange={(e) => setHouseDetails(e.target.value)} 
                      className="h-9 rounded-lg mt-1 text-xs" 
                      placeholder="e.g. Room 12, Door No 4A, Vijay Apartments" 
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground">Nearby Landmark (Optional)</Label>
                    <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} className="h-9 rounded-lg mt-1 text-xs" placeholder="e.g. Opposite the municipal water tank" />
                  </div>
                </div>
              ) : (
                searchQuery.trim().length >= 4 && suggestions.length === 0 && !isSearching && (
                  <p className="text-[11px] text-amber-500 font-medium bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                    ⚠️ No officially mapped location parameters found for that query. Please type a real neighborhood name.
                  </p>
                )
              )}
            </div>

            <div className="flex gap-2 justify-end border-t border-border/50 pt-3">
              <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setSelectedVerifiedAddress(null); setSearchQuery(""); setHouseDetails(""); }} className="h-8 text-xs rounded-lg">
                Cancel
              </Button>
              <Button 
                type="button" 
                disabled={!selectedVerifiedAddress || !houseDetails.trim() || addAddress.isPending}
                onClick={() => addAddress.mutate()} 
                className="h-8 text-xs rounded-lg font-bold px-4 bg-primary text-primary-foreground shadow"
              >
                {addAddress.isPending ? "Locking..." : "Save Location"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}