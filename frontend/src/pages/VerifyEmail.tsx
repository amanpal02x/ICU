import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const { user, sendVerificationEmail, logout, loading, reloadUser } =
    useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleResendEmail = async () => {
    if (!user) return;

    setIsSending(true);
    setError("");
    try {
      await sendVerificationEmail(user);
      toast("Email Sent", {
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (err: any) {
      setError("Failed to send email. Please try again in a moment.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setError("");
    try {
      await reloadUser();
      // After reloadUser(), the 'user' object from useAuth() is updated.
      // This component will re-render. The logic below (user.emailVerified)
      // will run again, and if verification is complete, it will navigate.
    } catch (err) {
      setError("Failed to check status. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // 1. While loading auth state, show nothing
  if (loading) {
    return null; // Or a full-page loader
  }

  // 2. If user is not logged in, send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If user IS logged in AND verified, send to dashboard
  if (user.emailVerified) {
    return <Navigate to="/" replace />;
  }

  // 4. If user is logged in and NOT verified, show this page
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to{" "}
            <strong className="text-foreground">{user.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Once you've clicked the link, click the button below to continue.
          </p>

          <Button
            onClick={handleCheckVerification}
            className="w-full"
            disabled={isChecking}>
            {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isChecking ? "Checking..." : "I've Verified My Email"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleResendEmail}
            className="w-full"
            disabled={isSending}>
            {isSending ? "Sending..." : "Resend Verification Email"}
          </Button>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
