import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, User, Mail, Phone, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  businessType: z.enum(["individual", "company", "financial_institution"], {
    required_error: "Please select a business type"
  }),
  tradingExperience: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select your trading experience"
  }),
  specializedCurrencies: z.string().optional(),
});

type RegistrationData = z.infer<typeof registrationSchema>;

interface UserRegistrationProps {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  onRegistrationComplete: () => void;
}

export default function UserRegistration({ user, onRegistrationComplete }: UserRegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      companyName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "",
      phoneNumber: "",
      address: "",
      businessType: "individual",
      tradingExperience: "beginner",
      specializedCurrencies: "",
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      return apiRequest("/api/auth/complete-registration", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      onRegistrationComplete();
    },
    onError: (error) => {
      console.error("Registration failed:", error);
    },
  });

  const onSubmit = (data: RegistrationData) => {
    setIsSubmitting(true);
    registrationMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
          <CardDescription>
            Welcome to Currencia! Please provide some additional information to set up your trading profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your first name" {...field} />
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
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your last name" {...field} />
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
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Company/Business Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Your business name (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual Trader</SelectItem>
                          <SelectItem value="company">Company/Business</SelectItem>
                          <SelectItem value="financial_institution">Financial Institution</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Business Address
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your business address"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradingExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Experience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your experience level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (1-5 years)</SelectItem>
                        <SelectItem value="advanced">Advanced (5+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specializedCurrencies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialized Currencies (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., USD, EUR, GBP, UGX, KES"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || registrationMutation.isPending}
              >
                {isSubmitting || registrationMutation.isPending ? "Setting up your account..." : "Complete Registration"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}