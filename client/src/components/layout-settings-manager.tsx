import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Settings, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LayoutSetting, InsertLayoutSetting } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NewLayoutForm {
  name: string;
  displayName: string;
  description: string;
  chatColumnSpan: number;
  sidebarColumnSpan: number;
}

const defaultForm: NewLayoutForm = {
  name: "",
  displayName: "",
  description: "",
  chatColumnSpan: 2,
  sidebarColumnSpan: 2,
};

export default function LayoutSettingsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState<LayoutSetting | null>(null);
  const [form, setForm] = useState<NewLayoutForm>(defaultForm);

  // Fetch layout settings
  const { data: layoutSettings, isLoading } = useQuery<LayoutSetting[]>({
    queryKey: ["/api/admin/layout-settings"],
  });

  // Create layout setting mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertLayoutSetting) => {
      return apiRequest("POST", "/api/admin/layout-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/layout-settings"] });
      toast({
        title: "Success",
        description: "Layout setting created successfully",
      });
      setIsCreateDialogOpen(false);
      setForm(defaultForm);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create layout setting",
        variant: "destructive",
      });
    },
  });

  // Update layout setting mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLayoutSetting> }) => {
      return apiRequest("PATCH", `/api/admin/layout-settings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/layout-settings"] });
      toast({
        title: "Success",
        description: "Layout setting updated successfully",
      });
      setEditingLayout(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update layout setting",
        variant: "destructive",
      });
    },
  });

  // Set default layout mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Setting default layout for ID:", id);
      const response = await apiRequest("POST", `/api/admin/layout-settings/${id}/set-default`);
      console.log("Set default response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/layout-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/layout-settings/active"] });
      // Force refresh of all layout-related queries
      queryClient.refetchQueries({ queryKey: ["/api/layout-settings/active"] });
      toast({
        title: "Success",
        description: "Default layout setting updated",
      });
    },
    onError: (error: any) => {
      console.error("Set default layout error:", error);
      const errorMessage = error?.message || error?.error || "Failed to set default layout";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete layout setting mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/layout-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/layout-settings"] });
      toast({
        title: "Success",
        description: "Layout setting deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete layout setting",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.displayName) {
      toast({
        title: "Error",
        description: "Name and display name are required",
        variant: "destructive",
      });
      return;
    }

    const layoutData: InsertLayoutSetting = {
      name: form.name,
      displayName: form.displayName,
      description: form.description || null,
      chatColumnSpan: form.chatColumnSpan,
      sidebarColumnSpan: form.sidebarColumnSpan,
      isDefault: false,
      isActive: true,
    };

    if (editingLayout) {
      updateMutation.mutate({ id: editingLayout.id, data: layoutData });
    } else {
      createMutation.mutate(layoutData);
    }
  };

  const handleEdit = (layout: LayoutSetting) => {
    setEditingLayout(layout);
    setForm({
      name: layout.name,
      displayName: layout.displayName,
      description: layout.description || "",
      chatColumnSpan: layout.chatColumnSpan,
      sidebarColumnSpan: layout.sidebarColumnSpan,
    });
    setIsCreateDialogOpen(true);
  };

  const getLayoutPreview = (chatSpan: number, sidebarSpan: number) => {
    const chatPercentage = (chatSpan / (chatSpan + sidebarSpan)) * 100;
    const sidebarPercentage = (sidebarSpan / (chatSpan + sidebarSpan)) * 100;
    
    return (
      <div className="flex h-8 rounded border overflow-hidden">
        <div 
          className="bg-blue-100 border-r flex items-center justify-center text-xs"
          style={{ width: `${chatPercentage}%` }}
        >
          Chat {chatPercentage.toFixed(0)}%
        </div>
        <div 
          className="bg-green-100 flex items-center justify-center text-xs"
          style={{ width: `${sidebarPercentage}%` }}
        >
          Sidebar {sidebarPercentage.toFixed(0)}%
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading layout settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Layout Settings</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage trading room layout configurations
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingLayout(null);
                setForm(defaultForm);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Layout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLayout ? "Edit Layout Setting" : "Create Layout Setting"}
              </DialogTitle>
              <DialogDescription>
                Configure the trading room layout proportions
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name (Identifier)</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., balanced-50-50"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g., Balanced 50/50 Layout"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Chat Column Span: {form.chatColumnSpan.toFixed(1)}</Label>
                <Slider
                  value={[form.chatColumnSpan]}
                  onValueChange={([value]) => 
                    setForm({ ...form, chatColumnSpan: value, sidebarColumnSpan: 4 - value })
                  }
                  min={0.5}
                  max={3.5}
                  step={0.1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5</span>
                  <span>3.5</span>
                </div>
              </div>
              
              <div>
                <Label>Sidebar Column Span: {form.sidebarColumnSpan.toFixed(1)}</Label>
                <Slider
                  value={[form.sidebarColumnSpan]}
                  onValueChange={([value]) => 
                    setForm({ ...form, sidebarColumnSpan: value, chatColumnSpan: 4 - value })
                  }
                  min={0.5}
                  max={3.5}
                  step={0.1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5</span>
                  <span>3.5</span>
                </div>
              </div>
              
              <div>
                <Label>Direct Value Input</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="chatInput" className="text-sm">Chat Span</Label>
                    <Input
                      id="chatInput"
                      type="number"
                      min="0.1"
                      max="3.9"
                      step="0.1"
                      value={form.chatColumnSpan}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0.1;
                        const clampedValue = Math.max(0.1, Math.min(3.9, value));
                        setForm({ 
                          ...form, 
                          chatColumnSpan: clampedValue, 
                          sidebarColumnSpan: 4 - clampedValue 
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sidebarInput" className="text-sm">Sidebar Span</Label>
                    <Input
                      id="sidebarInput"
                      type="number"
                      min="0.1"
                      max="3.9"
                      step="0.1"
                      value={form.sidebarColumnSpan}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0.1;
                        const clampedValue = Math.max(0.1, Math.min(3.9, value));
                        setForm({ 
                          ...form, 
                          sidebarColumnSpan: clampedValue, 
                          chatColumnSpan: 4 - clampedValue 
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total must equal 4.0 (Chat: {form.chatColumnSpan.toFixed(1)} + Sidebar: {form.sidebarColumnSpan.toFixed(1)} = {(form.chatColumnSpan + form.sidebarColumnSpan).toFixed(1)})
                </p>
              </div>
              
              <div>
                <Label>Layout Preview</Label>
                <div className="mt-2">
                  {getLayoutPreview(form.chatColumnSpan, form.sidebarColumnSpan)}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingLayout ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {layoutSettings?.map((layout) => (
          <Card key={layout.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {layout.displayName}
                    {layout.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                    {!layout.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {layout.description || "No description provided"}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(layout)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {!layout.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(layout.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Set Default
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={layout.isDefault}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Layout Setting</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{layout.displayName}"? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(layout.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">Layout Preview</Label>
                  {getLayoutPreview(layout.chatColumnSpan, layout.sidebarColumnSpan)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Chat Columns:</span> {layout.chatColumnSpan}/4
                  </div>
                  <div>
                    <span className="font-medium">Sidebar Columns:</span> {layout.sidebarColumnSpan}/4
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!layoutSettings?.length && (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No Layout Settings
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first layout setting to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}