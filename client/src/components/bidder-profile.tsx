import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, CheckCircle, Building, Clock, DollarSign, Globe, Phone, MapPin, FileText, Star } from "lucide-react";
import type { User as UserType } from "@shared/schema";

const bidderProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  specializedCurrencies: z.array(z.string()).optional(),
  minimumTransactionAmount: z.string().optional(),
  maximumTransactionAmount: z.string().optional(),
  operatingHours: z.string().optional(),
  responseTimeMinutes: z.number().min(1).max(1440).optional(),
  commission: z.string().optional(),
  bio: z.string().optional(),
  phoneNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  website: z.string().optional(),
});

type BidderProfileData = z.infer<typeof bidderProfileSchema>;

const currencies = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "SGD"];

export default function BidderProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);

  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm<BidderProfileData>({
    resolver: zodResolver(bidderProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      licenseNumber: "",
      yearsOfExperience: 0,
      specializedCurrencies: [],
      minimumTransactionAmount: "",
      maximumTransactionAmount: "",
      operatingHours: "",
      responseTimeMinutes: 30,
      commission: "",
      bio: "",
      phoneNumber: "",
      businessAddress: "",
      website: "",
    },
  });

  // Update form values when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        companyName: user.companyName || "",
        licenseNumber: user.licenseNumber || "",
        yearsOfExperience: user.yearsOfExperience || 0,
        specializedCurrencies: user.specializedCurrencies || [],
        minimumTransactionAmount: user.minimumTransactionAmount || "",
        maximumTransactionAmount: user.maximumTransactionAmount || "",
        operatingHours: user.operatingHours || "",
        responseTimeMinutes: user.responseTimeMinutes || 30,
        commission: user.commission || "",
        bio: user.bio || "",
        phoneNumber: user.phoneNumber || "",
        businessAddress: user.businessAddress || "",
        website: user.website || "",
      });
      setSelectedCurrencies(user.specializedCurrencies || []);
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: BidderProfileData) => {
      const response = await fetch("/api/auth/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          specializedCurrencies: selectedCurrencies,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your bidder profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BidderProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const addCurrency = (currency: string) => {
    if (!selectedCurrencies.includes(currency)) {
      setSelectedCurrencies([...selectedCurrencies, currency]);
    }
  };

  const removeCurrency = (currency: string) => {
    setSelectedCurrencies(selectedCurrencies.filter(c => c !== currency));
  };

  if (userLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // All traders can now access profile management

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building className="h-8 w-8" />
          Trader Profile
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete your professional profile to build trust with other traders and showcase your expertise.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>
                Provide detailed information about your trading business and expertise.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Forex Trading Ltd." {...field} />
                        </FormControl>
                        <FormDescription>
                          Your registered business name (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
                          <FormControl>
                            <Input placeholder="FX123456" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your trading license or registration number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="yearsOfExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="5" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormLabel>Specialized Currencies</FormLabel>
                    <div className="mt-2 space-y-3">
                      <Select onValueChange={addCurrency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add currency specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.filter(c => !selectedCurrencies.includes(c)).map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        {selectedCurrencies.map((currency) => (
                          <Badge key={currency} variant="secondary" className="cursor-pointer" onClick={() => removeCurrency(currency)}>
                            {currency} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minimumTransactionAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Transaction Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="1000.00" {...field} />
                          </FormControl>
                          <FormDescription>
                            Minimum amount you're willing to trade
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maximumTransactionAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Transaction Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="100000.00" {...field} />
                          </FormControl>
                          <FormDescription>
                            Maximum amount you can handle
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responseTimeMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response Time (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="30" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                            />
                          </FormControl>
                          <FormDescription>
                            Average time to respond to requests
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="commission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission Rate (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="0.25" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your typical commission percentage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="operatingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operating Hours</FormLabel>
                        <FormControl>
                          <Input placeholder="9:00 AM - 6:00 PM EST" {...field} />
                        </FormControl>
                        <FormDescription>
                          When you're typically available for trading
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell subscribers about your experience, expertise, and what sets you apart..."
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          A brief description of your background and expertise
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourcompany.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="123 Business Street, City, State, Country"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    className="w-full"
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Profile Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {user?.isVerified ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-gray-300" />
                )}
                <span className={user?.isVerified ? "text-green-600" : "text-gray-500"}>
                  {user?.isVerified ? "Verified Bidder" : "Unverified"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.isVerified 
                  ? "Your profile has been verified by our team."
                  : "Complete your profile to apply for verification."
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Account Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${user?.balance || "0.00"}
              </div>
              <p className="text-sm text-muted-foreground">
                Available for trading
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Experience</span>
                <span className="font-medium">{user?.yearsOfExperience || 0} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Response Time</span>
                <span className="font-medium">{user?.responseTimeMinutes || 30} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Commission</span>
                <span className="font-medium">{user?.commission || "N/A"}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Specializations</span>
                <span className="font-medium">{user?.specializedCurrencies?.length || 0} currencies</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}