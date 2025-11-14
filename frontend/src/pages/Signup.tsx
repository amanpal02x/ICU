import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Shield, Stethoscope, BriefcaseMedical } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

  // 1. Define the schema with password confirmation
  const formSchema = z
    .object({
      prefix: z.string().min(1, { message: "Please select a prefix." }),
      firstName: z.string().min(1, { message: "First name is required." }),
      lastName: z.string().min(1, { message: "Last name is required." }),
      role: z.enum(["admin", "doctor", "nurse"], { message: "Please select a role." }),
      hospitalName: z.string().optional(),
      hospitalId: z.string().optional(),
      email: z.string().email({ message: "Invalid email address." }),
      password: z
        .string()
        .min(6, { message: "Password must be at least 6 characters." }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })
    .refine((data) => {
      if (data.role === "admin") {
        return data.hospitalName && data.hospitalName.length > 0;
      }
      return data.hospitalId && data.hospitalId.length > 0;
    }, {
      message: "Hospital ID is required for doctors and nurses",
      path: ["hospitalId"],
    });

export default function SignupPage() {
  const [error, setError] = useState("");
  const { registerHospital, registerStaff } = useAuth();
  const navigate = useNavigate();

  // 2. Define the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefix: "",
      firstName: "",
      lastName: "",
      role: undefined,
      hospitalName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 3. Define a submit handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Starting signup form submission with values:", values);
    setError(""); // Clear previous errors

    try {
      const displayName = `${values.prefix} ${values.firstName} ${values.lastName}`;
      console.log("Processing registration for role:", values.role);

      let result;

      if (values.role === "admin") {
        // Hospital admin registration
        const hospitalData = {
          hospital_name: values.hospitalName!,
          admin_email: values.email,
          admin_display_name: displayName,
          admin_password: values.password, // Include the password from form
          admin_phone: undefined, // Optional field
        };
        console.log("Calling registerHospital with data:", hospitalData);
        result = await registerHospital(hospitalData);
        console.log("Hospital registration completed:", result);
      } else {
        // Staff (doctor/nurse) registration
        const staffData = {
          email: values.email,
          display_name: displayName,
          role: values.role as "doctor" | "nurse",
          password: values.password, // Include the password from form
          phone: undefined, // Optional field
          department_id: undefined, // Optional field
        };
        console.log("Calling registerStaff with data:", staffData, "hospitalId:", values.hospitalId);
        result = await registerStaff(staffData, values.hospitalId!);
        console.log("Staff registration completed:", result);
      }

      // Registration successful
      console.log("Account created successfully");
      toast("Account Created Successfully", {
        description: "You can now log in with your credentials.",
      });
      console.log("Navigating to /login");
      navigate("/login"); // Redirect to login page

    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("Registration error:", error);

      // Handle different error types from backend
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        setError("This email is already in use.");
      } else if (error.message?.includes("password")) {
        setError("Password does not meet requirements.");
      } else if (error.message?.includes("email")) {
        setError("Invalid email address.");
      } else if (error.message?.includes("hospital")) {
        setError("Hospital registration failed. Please check hospital details.");
      } else {
        setError(`Failed to create an account: ${error.message || "Unknown error"}`);
      }
    } finally {
      // Reset form submitting state
      form.reset({}, { keepValues: false });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-2xl">Sign Up</CardTitle>
              <CardDescription>
                Enter your information to create an account.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Prefix</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                          <SelectItem value="Mrs.">Mrs.</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Reset hospital fields when role changes
                      form.setValue('hospitalName', '');
                      form.setValue('hospitalId', '');
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin (Hospital)
                          </div>
                        </SelectItem>
                        <SelectItem value="doctor">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            Doctor
                          </div>
                        </SelectItem>
                        <SelectItem value="nurse">
                          <div className="flex items-center gap-2">
                            <BriefcaseMedical className="h-4 w-4" />
                            Nurse
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('role') === 'admin' && (
                <FormField
                  control={form.control}
                  name="hospitalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hospital Name</FormLabel>
                      <FormControl>
                        <Input placeholder="City General Hospital" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {(form.watch('role') === 'doctor' || form.watch('role') === 'nurse') && (
                <FormField
                  control={form.control}
                  name="hospitalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hospital ID</FormLabel>
                      <FormControl>
                        <Input placeholder="HOSP001" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-600">
                        Enter the hospital ID provided by your hospital admin
                      </p>
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Creating Account..."
                  : "Sign Up"}
              </Button>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="underline">
                  Login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
