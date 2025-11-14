import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// --- REMOVED: Recharts imports ---

interface VitalCardProps {
  label: string;
  value: string; // Changed to string
  unit: string;
  status: "normal" | "warning" | "critical";
  // --- REMOVED: sparklineData prop ---
  min?: number;
  max?: number;
  gaugeValue?: number; // --- ADDED: For BP card gauge ---
}

const VitalCard = ({
  label,
  value,
  unit,
  status,
  min = 0,
  max = 100,
  gaugeValue,
}: VitalCardProps) => {
  const statusColors = {
    normal: "text-success",
    warning: "text-warning",
    critical: "text-destructive",
  };

  const statusLabels = {
    normal: "Stable",
    warning: "Warning",
    critical: "Critical",
  };

  // --- UPDATED: Use gaugeValue if provided, otherwise parse 'value' ---
  const numericValue = gaugeValue ?? parseFloat(value.split("/")[0]);
  const percentage = isNaN(numericValue)
    ? 0
    : ((numericValue - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // --- REMOVED: generateSparklinePath function ---

  return (
    <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
      {/* Circular gauge background */}
      <div className="relative w-32 h-32 mx-auto mb-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={`hsl(var(--${
              status === "normal"
                ? "success"
                : status === "warning"
                ? "warning"
                : "destructive"
            }))`}
            strokeWidth="8"
            strokeDasharray={`${(clampedPercentage / 100) * 251.2} 251.2`}
            className="transition-all duration-500"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs text-muted-foreground mb-1">{label}</div>
          {/* Handle different text sizes for BP */}
          <div
            className={`font-bold ${
              value.length > 5 ? "text-2xl" : "text-3xl"
            }`}
          >
            {value}
          </div>
          <div className="text-xs text-muted-foreground">{unit}</div>
        </div>
      </div>

      {/* --- REMOVED: Sparkline --- */}

      {/* Status */}
      <div className="flex items-center justify-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${statusColors[status].replace(
            "text-",
            "bg-"
          )}`}
        ></div>
        <span className={`text-xs font-medium ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
    </div>
  );
};

export default VitalCard;