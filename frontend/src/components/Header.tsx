import { Bell, Upload, UserCircle, LogOut, Shield, User, HelpCircle } from "lucide-react";
import GradientText from "./GradientText";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import Dropdown components
import { Button } from "./ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface HeaderProps {
  alarmCount?: number;
  showAlarms?: boolean;
}

const Header = ({ alarmCount = 0, showAlarms = true }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login"); // Redirect to login after logout
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleScheduleDemo = () => {
    // For now, just show an alert. In a real app, this would navigate to a demo booking page or open a calendar
    alert("Demo scheduled! Our team will contact you shortly.");
    setHelpDialogOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-3 sm:px-6 py-2 sm:py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <img src="/logo.png" className="h-7 w-7 sm:h-9 sm:w-9" alt="ICU Alarm Center Logo" />
          <h1 className="font-sans text-base sm:text-xl font-bold tracking-wide hidden xs:block sm:block">
            ICU ALARM CENTER
          </h1>
          <h1 className="font-sans text-base sm:text-xl font-bold tracking-wide xs:hidden">
            ICU
          </h1>
        </div>

        {/* Desktop: Center alarms and upload button */}
        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-4">
          {showAlarms && alarmCount > 0 && (
            <div className="alarm-info">
              <div
                className="alarm-box alarm-box--active is-pulsing text-sm"
                role="status"
                aria-live="polite"
                aria-atomic="true">
                <GradientText
                  colors={["#FFFFFF", "#FFFFFF"]}
                  animationSpeed={3}
                  showBorder={false}
                  className="text-sm">
                  {alarmCount} Active Alarms
                </GradientText>
              </div>
            </div>
          )}
          {(location.pathname === "/" || location.pathname.startsWith("/dashboard")) && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3"
              onClick={() => navigate("/upload")}
            >
              <Upload className="w-4 h-4 mr-2" />
              <span>Upload</span>
            </Button>
          )}
        </div>

        {/* Mobile: Right side elements */}
        <div className="flex items-center gap-1 sm:gap-4 md:hidden">
          {(location.pathname === "/" || location.pathname.startsWith("/dashboard")) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate("/upload")}
              aria-label="Upload"
            >
              <Upload className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Help button and User menu - always on the right */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={() => setHelpDialogOpen(true)}
            aria-label="Help and Support"
            title="Help and Support"
          >
            <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0">
                  <img
                    src="/avatar.png"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    alt="User Avatar"
                  />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.display_name || user.email}
                  </p>
                  {user.display_name && (
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              {role === 'admin' && (
                <>
                  <DropdownMenuItem
                    onClick={() => navigate('/admin')}
                    className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>

        {/* Help Dialog */}
        <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Help & Support</DialogTitle>
              <DialogDescription>
                Get assistance with ICU Alarm Center or schedule a demo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Contact Information</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                  <p><strong>Email:</strong> support@icualarmcenter.com</p>
                  <p><strong>Hours:</strong> 24/7 Technical Support</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleScheduleDemo}
                  className="flex-1"
                >
                  Schedule Demo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setHelpDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
};

export default Header;
