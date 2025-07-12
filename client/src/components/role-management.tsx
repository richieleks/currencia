import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Role, Permission } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Users,
  Key
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { PERMISSION_CATEGORIES } from "@/lib/rbac";

interface RoleManagementProps {
  className?: string;
}

export default function RoleManagement({ className }: RoleManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Partial<Role>>({});

  // Fetch roles and permissions
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/admin/permissions"],
  });

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: Partial<Role>) => {
      return apiRequest("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify(roleData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      setIsCreateDialogOpen(false);
      setEditingRole({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (roleData: { id: number; updates: Partial<Role> }) => {
      return apiRequest(`/api/admin/roles/${roleData.id}`, {
        method: "PATCH",
        body: JSON.stringify(roleData.updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingRole({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return apiRequest(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleCreateRole = () => {
    setEditingRole({
      name: "",
      description: "",
      permissions: [],
      isSystemRole: false,
    });
    setIsCreateDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditingRole({
      name: role.name,
      description: role.description,
      permissions: role.permissions || [],
      isSystemRole: role.isSystemRole,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, updates: editingRole });
    } else {
      createRoleMutation.mutate(editingRole);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    const currentPermissions = editingRole.permissions || [];
    if (checked) {
      setEditingRole({
        ...editingRole,
        permissions: [...currentPermissions, permission],
      });
    } else {
      setEditingRole({
        ...editingRole,
        permissions: currentPermissions.filter(p => p !== permission),
      });
    }
  };

  const isPermissionSelected = (permission: string): boolean => {
    return (editingRole.permissions || []).includes(permission);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Manage roles and their permissions
              </CardDescription>
            </div>
            <Button onClick={handleCreateRole}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading roles...
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {role.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role.permissions?.length || 0} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={role.isSystemRole 
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }
                        >
                          {role.isSystemRole ? "System" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(role.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRole(role)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!role.isSystemRole && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedRole(role);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog 
        open={isCreateDialogOpen || isEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingRole({});
            setSelectedRole(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
            <DialogDescription>
              {selectedRole 
                ? "Update role information and permissions" 
                : "Create a new role with specific permissions"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  value={editingRole.name || ""}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={editingRole.description || ""}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Describe this role and its purpose"
                  rows={3}
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Permissions</Label>
              <div className="mt-3 space-y-6">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {categoryPermissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={isPermissionSelected(permission)}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(permission, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={permission}
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingRole({});
                setSelectedRole(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRole}
              disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
            >
              {createRoleMutation.isPending || updateRoleMutation.isPending
                ? "Saving..." 
                : selectedRole ? "Update Role" : "Create Role"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{selectedRole?.name}"? 
              This action cannot be undone and will affect all users with this role.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedRole && deleteRoleMutation.mutate(selectedRole.id)}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}