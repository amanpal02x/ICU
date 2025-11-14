import { useRef } from "react";
import { ServerPatientData, ServerVital } from "@/types/patientData";
import VitalCard from "./VitalCard";
import TrendsChart from "./TrendsChart";
import { User } from "lucide-react";

interface MainDashboardProps {
  patient: ServerPatientData;
  onToggleLock?: () => void;
}

const formatVitalValue = (vital?: ServerVital): string => {
  if (!vital) return "N/A";
  if (vital.value === "nan" || isNaN(parseFloat(vital.value))) {
    return "---";
  }
  const num = parseFloat(vital.value);
  // Adjust formatting as needed
  if (num < 10 && num % 1 !== 0) return num.toFixed(1);
  return num.toFixed(0);
};

const getStatus = (vital?: ServerVital): "normal" | "warning" | "critical" => {
  if (!vital) return "normal";
  if (vital.status === "stable") return "normal";
  return vital.status;
};

const MainDashboard = ({ patient, onToggleLock }: MainDashboardProps) => {
  const clickTimestamps = useRef<{ [key: string]: number }>({});

  // Mock trends data for the last 12 hours
  const trendsData = [
    { name: "12h", heartRate: 72, bp_sys: 118, bp_dia: 78, spO2: 98, respirate: 16, temp: 36.8, etco2: 38 },
    { name: "11h", heartRate: 75, bp_sys: 122, bp_dia: 80, spO2: 97, respirate: 18, temp: 37.0, etco2: 39 },
    { name: "10h", heartRate: 78, bp_sys: 125, bp_dia: 82, spO2: 99, respirate: 17, temp: 36.9, etco2: 37 },
    { name: "9h", heartRate: 74, bp_sys: 120, bp_dia: 79, spO2: 98, respirate: 16, temp: 36.7, etco2: 38 },
    { name: "8h", heartRate: 76, bp_sys: 123, bp_dia: 81, spO2: 97, respirate: 19, temp: 37.1, etco2: 40 },
    { name: "7h", heartRate: 73, bp_sys: 119, bp_dia: 77, spO2: 99, respirate: 15, temp: 36.6, etco2: 36 },
    { name: "6h", heartRate: 79, bp_sys: 126, bp_dia: 83, spO2: 98, respirate: 18, temp: 37.2, etco2: 39 },
    { name: "5h", heartRate: 71, bp_sys: 117, bp_dia: 76, spO2: 96, respirate: 17, temp: 36.5, etco2: 37 },
    { name: "4h", heartRate: 77, bp_sys: 124, bp_dia: 80, spO2: 99, respirate: 16, temp: 36.8, etco2: 38 },
    { name: "3h", heartRate: 74, bp_sys: 121, bp_dia: 79, spO2: 98, respirate: 18, temp: 37.0, etco2: 39 },
    { name: "2h", heartRate: 76, bp_sys: 123, bp_dia: 81, spO2: 97, respirate: 17, temp: 36.9, etco2: 37 },
    { name: "1h", heartRate: 75, bp_sys: 120, bp_dia: 78, spO2: 98, respirate: 16, temp: 36.7, etco2: 38 },
    { name: "Now", heartRate: parseFloat(patient.vitals.HR?.value || "72"), bp_sys: parseFloat(patient.vitals.SBP?.value || "120"), bp_dia: parseFloat(patient.vitals.DBP?.value || "80"), spO2: parseFloat(patient.vitals["SpO₂"]?.value || "98"), respirate: parseFloat(patient.vitals.RR?.value || "16"), temp: 36.8, etco2: 38 },
  ];

  const bpDisplayValue = `${formatVitalValue(
    patient.vitals.SBP
  )}/${formatVitalValue(patient.vitals.DBP)}`;

  const bpStatus =
    getStatus(patient.vitals.SBP) === "critical" ||
    getStatus(patient.vitals.DBP) === "critical"
      ? "critical"
      : getStatus(patient.vitals.SBP) === "warning" ||
        getStatus(patient.vitals.DBP) === "warning"
      ? "warning"
      : "normal";

  const handlePatientClick = () => {
    if (!onToggleLock) return;

    const now = Date.now();
    const lastClick = clickTimestamps.current[patient.patient_id] || 0;
    const timeDiff = now - lastClick;

    // Double click detection (within 300ms)
    if (timeDiff < 300) {
      onToggleLock(); // Stop cycling on double click
    }

    clickTimestamps.current[patient.patient_id] = now;
  };

  return (
    <div className="bg-card h-full overflow-y-auto">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
              <img src="/profile.png" className="h-10 w-10 sm:h-12 sm:w-12" alt="" />
            </div>
            <div className="min-w-0 flex-1 cursor-pointer" onClick={handlePatientClick}>
              <h2 className="text-xl sm:text-2xl font-bold truncate">{patient.name}</h2>
              <p className="text-sm text-muted-foreground">
                Room: {patient.room}
              </p>
            </div>
          </div>
          {/* AI Risk Score */}
          <div
            className={`text-center sm:text-right p-3 rounded-lg flex-shrink-0 ${
              patient.ai_prediction.is_at_risk
                ? "bg-destructive/20"
                : "bg-success/20"
            }`}>
            <div className="text-xs text-muted-foreground">AI RISK SCORE</div>
            <div
              className={`text-xl sm:text-2xl font-bold ${
                patient.ai_prediction.is_at_risk
                  ? "text-destructive"
                  : "text-success"
              }`}>
              {patient.ai_prediction.risk_score_percent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-4">
          REAL-TIME VITALS & TRENDS
        </h3>

        {/* Vitals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <VitalCard
            label="PULSE"
            // --- UPDATED: Use HR ---
            value={formatVitalValue(patient.vitals.HR)}
            unit="BPM"
            status={getStatus(patient.vitals.HR)}
            min={40}
            max={140}
          />
          <VitalCard
            label="BP"
            value={bpDisplayValue}
            unit="mmHg"
            status={bpStatus}
            // --- UPDATED: Use SBP for gauge ---
            gaugeValue={parseFloat(patient.vitals.SBP.value)}
            min={60}
            max={180}
          />
          <VitalCard
            label="SpO₂"
            // --- UPDATED: Use SpO₂ ---
            value={formatVitalValue(patient.vitals["SpO₂"])}
            unit="%"
            status={getStatus(patient.vitals["SpO₂"])}
            min={80}
            max={100}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <VitalCard
            label="RESPIRATION"
            // --- UPDATED: Use RR ---
            value={formatVitalValue(patient.vitals.RR)}
            unit="br/min"
            status={getStatus(patient.vitals.RR)}
            min={8}
            max={30}
          />

          {/* Vitals not in server data are now marked N/A */}
          <VitalCard
            label="TEMP"
            value="N/A"
            unit="°C"
            status="normal"
            min={35}
            max={40}
          />
          <VitalCard
            label="ETCO₂"
            value="N/A"
            unit="mmHg"
            status="normal"
            min={25}
            max={55}
          />
        </div>

        {/* Trends Chart */}
        <div className="mb-6 sm:mb-8">
          <TrendsChart
            title="VITAL SIGNS TRENDS (LAST 12 HOURS)"
            data={trendsData}
            lines={[
              {
                dataKey: "heartRate",
                color: "hsl(var(--chart-1))",
                name: "Heart Rate (BPM)",
              },
              {
                dataKey: "bp_sys",
                color: "hsl(var(--chart-2))",
                name: "BP Systolic (mmHg)",
              },
              {
                dataKey: "spO2",
                color: "hsl(var(--chart-3))",
                name: "SpO₂ (%)",
              },
            ]}
          />
        </div>

        {/* Trends Charts */}
        {/* <TrendsChart
          title="TRENDS (LAST 12 HRS)"
          data={combinedTrendsData}
          lines={[
            {
              dataKey: "bp_sys",
              color: "hsl(var(--chart-1))",
              name: "BP - Systolic",
            },
            {
              dataKey: "bp_dia",
              color: "hsl(var(--chart-1))",
              name: "BP - Diastolic",
            },
            { dataKey: "spO2", color: "hsl(var(--chart-2))", name: "SPo₂" },
            { dataKey: "temp", color: "hsl(var(--chart-3))", name: "Temp" },
          ]}
        /> */}

        {/* <div className="mt-4">
          <TrendsChart
            title="TRENDS (LAST 12 HRS)"
            data={secondaryTrendsData}
            lines={[
              {
                dataKey: "heartRate",
                color: "hsl(var(--chart-1))",
                name: "Heart Rate",
              },
              {
                dataKey: "respirate",
                color: "hsl(var(--chart-3))",
                name: "Respirate",
              },
              { dataKey: "etco2", color: "hsl(var(--chart-2))", name: "ETCO₂" },
            ]}
          />
        </div> */}
      </div>
    </div>
  );
};

export default MainDashboard;
