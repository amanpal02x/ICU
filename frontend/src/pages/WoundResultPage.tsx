import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Dot } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, FileText, Calendar, User, Activity, Clock, AlertTriangle, Loader2, History } from "lucide-react";
import Header from "@/components/Header";

// Mock data for the healing chart
const healingData = [
  { day: "Day 1", actual: 15, predicted: 12 },
  { day: "Day 3", actual: 28, predicted: 25 },
  { day: "Day 5", actual: 34, predicted: 38 },
  { day: "Day 7", actual: 42, predicted: 48 },
  { day: "Day 10", actual: 55, predicted: 58 },
  { day: "Day 12", actual: 62, predicted: 65 },
  { day: "Day 15", actual: 68, predicted: 72 },
  { day: "Day 17", actual: 75, predicted: 78 },
  { day: "Day 20", actual: 82, predicted: 83 },
];

const chartConfig = {
  actual: {
    label: "Actual Healing",
    color: "hsl(var(--chart-1))",
  },
  predicted: {
    label: "Predicted Recovery",
    color: "hsl(var(--chart-2))",
  },
};

const WoundResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sliderValue, setSliderValue] = useState([50]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [patientAge, setPatientAge] = useState<number>(67);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Check if we're coming from upload with analyzing state or real results
  useEffect(() => {
    if (location.state?.predictionResult) {
      // We have real API results
      setUploadedImage(location.state.image);
      setPatientAge(location.state.age);
      setIsAnalyzing(false);
      // Results are already available in predictionResult
    } else if (location.state?.isAnalyzing) {
      // Legacy behavior - still analyzing
      setIsAnalyzing(true);
      setUploadedImage(location.state.image);
      setPatientAge(location.state.age);

      // Simulate analysis delay, then show results
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
        // Clear the state so refreshing doesn't trigger analysis again
        navigate('/wound-result', { replace: true });
      }, 3000); // 3 seconds of analysis

      return () => clearTimeout(timer);
    }
  }, [location.state, navigate]);

  // Use real API data if available, otherwise fall back to mock data
  const predictionResult = location.state?.predictionResult;

  const patientData = predictionResult ? {
    // Real API data
    age: predictionResult.patient_age || patientAge,
    predictionDate: new Date().toISOString().split('T')[0],
    woundCategory: predictionResult.prediction?.name || "Unknown Condition",
    currentHealing: Math.round(predictionResult.confidence * 100), // Convert confidence to percentage
    improvement: Math.round(predictionResult.confidence * 10), // Mock improvement based on confidence
    estimatedDays: predictionResult.prediction?.severity?.includes("Severe") ? "21–28" :
                   predictionResult.prediction?.severity?.includes("Moderate") ? "12–18" : "7–12",
    severity: predictionResult.prediction?.severity?.split(" (")[0] || "Unknown", // Remove modifiers
    severityColor: predictionResult.prediction?.severity?.includes("Severe") ? "destructive" :
                   predictionResult.prediction?.severity?.includes("Moderate") ? "warning" : "success",
    inflammationIndex: (predictionResult.confidence || 0).toFixed(2),
    tissueHealth: predictionResult.prediction?.severity?.includes("Severe") ? "Critical" :
                  predictionResult.prediction?.severity?.includes("Moderate") ? "Improving" : "Good"
  } : {
    // Mock fallback data
    age: patientAge,
    predictionDate: new Date().toISOString().split('T')[0],
    woundCategory: "Diabetic Foot Ulcer",
    currentHealing: 42,
    improvement: 12,
    estimatedDays: "12–15",
    severity: "Moderate",
    severityColor: "warning",
    inflammationIndex: 0.63,
    tissueHealth: "Improving"
  };

  // Function to generate and download PDF report
  const handleDownloadPDF = () => {
    // Create a simple text-based PDF content
    const reportContent = `
WOUND HEALING PREDICTION REPORT

Patient Information:
- Age: ${patientData.age} years
- Prediction Date: ${new Date(patientData.predictionDate).toLocaleDateString()}
- Wound Category: ${patientData.woundCategory}

Analysis Results:
- Current Healing Progress: ${patientData.currentHealing}%
- Improvement: +${patientData.improvement}% compared to last scan
- Estimated Recovery Time: ${patientData.estimatedDays} days
- Severity Level: ${patientData.severity}
- Inflammation Index: ${patientData.inflammationIndex}
- Tissue Health: ${patientData.tissueHealth}

Healing Timeline Data:
${healingData.map(point => `${point.day}: Actual ${point.actual}%, Predicted ${point.predicted}%`).join('\n')}

Report Generated: ${new Date().toLocaleString()}
AI-Powered Analysis by ICU Monitor System
    `.trim();

    // Create a blob with the report content
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `wound-report-${patientData.age}yo-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  // Function to open healing history dialog
  const handleViewHistory = () => {
    setIsHistoryDialogOpen(true);
  };

  // Show analyzing screen if still processing
  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto px-6 py-8 pt-24 max-w-4xl">
          <div className="text-center">
            <div className="p-12">
              <div className="flex flex-col items-center space-y-6">
                {/* Animated loader */}
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                </div>

                {/* Analyzing text */}
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">Analyzing Wound Image</h1>
                  <p className="text-muted-foreground">
                    Our AI is processing your wound image and generating predictions...
                  </p>
                </div>

                {/* Progress indicators */}
                <div className="w-full max-w-md space-y-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Processing image...</span>
                    <span>25%</span>
                  </div>
                  <Progress value={25} className="h-2" />

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Analyzing tissue...</span>
                    <span>50%</span>
                  </div>
                  <Progress value={50} className="h-2" />

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Generating predictions...</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>

                {/* Patient info */}
                {uploadedImage && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border/50">
                      <img
                        src={URL.createObjectURL(uploadedImage)}
                        alt="Uploaded wound"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Patient Age: {patientAge} years</p>
                      <p className="text-sm text-muted-foreground">File: {uploadedImage.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-6 py-8 pt-24 max-w-7xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Wound Healing Prediction Results</h1>
          <p className="text-muted-foreground">
            AI-powered analysis and recovery timeline for optimal patient care
          </p>
        </div>

        {/* Main Layout - Left Sidebar + Right Content */}
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 mb-8">
          {/* Left Sidebar - Patient Info (Highlighted) */}
          <div className="xl:w-1/3">
            <div className="bg-muted/30 rounded-lg p-4 sm:p-6 lg:p-8 border border-border/20">
              <div className="text-center mb-6">
                {/* Wound Image Preview - Responsive */}
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-4 border-primary/20 shadow-lg">
                    <img
                      src={uploadedImage ? URL.createObjectURL(uploadedImage) : "/placeholder.svg"}
                      alt="Wound preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                  </div>
                </div>
              </div>

              {/* Patient Details - Responsive */}
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">Patient Age</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{patientData.age} years</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">Prediction Date</span>
                  </div>
                  <p className="text-lg sm:text-xl font-semibold text-foreground">{new Date(patientData.predictionDate).toLocaleDateString()}</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">Wound Category</span>
                  </div>
                  <p className="text-lg sm:text-xl font-semibold text-foreground">{patientData.woundCategory}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="xl:w-2/3">
            {/* Main Metrics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Current Healing Progress */}
              <div className="p-4 sm:p-6">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    {patientData.currentHealing}%
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">Current Healing Progress</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    Compared to last scan: <span className="text-success font-medium">+{patientData.improvement}% improvement</span>
                  </p>
                  <Progress value={patientData.currentHealing} className="h-2" />
                </div>
              </div>

              {/* Estimated Recovery Time */}
              <div className="p-4 sm:p-6">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    {patientData.estimatedDays}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">Estimated Recovery Time</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Based on tissue density + age-based recovery rate
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium text-foreground">Days Remaining</span>
                  </div>
                </div>
              </div>

              {/* Wound Severity Level - Full Width */}
              <div className="p-4 sm:p-6 sm:col-span-2">
                <div className="text-center">
                  <Badge
                    variant={patientData.severityColor === "destructive" ? "destructive" :
                            patientData.severityColor === "success" ? "default" : "secondary"}
                    className={`text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2 mb-3 ${
                      patientData.severityColor === "destructive" ? "bg-destructive text-destructive-foreground" :
                      patientData.severityColor === "success" ? "bg-green-600 text-white" :
                      "bg-warning text-warning-foreground"
                    }`}
                  >
                    {patientData.severity}
                  </Badge>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">Wound Severity Level</h3>
                  <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Inflammation Index</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{patientData.inflammationIndex}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tissue Health</p>
                      <p className="text-xl sm:text-2xl font-bold text-success">{patientData.tissueHealth}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Centered Timeline Section - Below everything */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Healing Progress Timeline</h3>
            </div>
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <LineChart data={healingData}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Healing %', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-actual)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-actual)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "var(--color-actual)", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--color-predicted)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "var(--color-predicted)", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: "var(--color-predicted)", strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-sm text-muted-foreground">Actual Healing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-success"></div>
                <span className="text-sm text-muted-foreground">Predicted Recovery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Centered Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="flex items-center gap-2 px-8 py-3"
            onClick={handleDownloadPDF}
          >
            <Download className="w-5 h-5" />
            Download Report (PDF)
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex items-center gap-2 px-8 py-3"
            onClick={handleViewHistory}
          >
            <FileText className="w-5 h-5" />
            View Full Healing History
          </Button>
        </div>

        {/* Healing History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Full Healing History
              </DialogTitle>
              <DialogDescription>
                Complete healing progress timeline for this patient
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Patient Summary */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Patient Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Age:</span> {patientData.age} years
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wound Type:</span> {patientData.woundCategory}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Status:</span> {patientData.currentHealing}% healed
                  </div>
                  <div>
                    <span className="text-muted-foreground">Severity:</span> {patientData.severity}
                  </div>
                </div>
              </div>

              {/* Healing Timeline Table */}
              <div>
                <h3 className="font-semibold mb-4">Detailed Healing Timeline</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border p-3 text-left">Date</th>
                        <th className="border border-border p-3 text-center">Day</th>
                        <th className="border border-border p-3 text-center">Actual Healing (%)</th>
                        <th className="border border-border p-3 text-center">Predicted Healing (%)</th>
                        <th className="border border-border p-3 text-center">Variance</th>
                        <th className="border border-border p-3 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healingData.map((point, index) => {
                        const variance = point.actual - point.predicted;
                        const date = new Date();
                        date.setDate(date.getDate() - (healingData.length - 1 - index));

                        return (
                          <tr key={index} className="hover:bg-muted/20">
                            <td className="border border-border p-3">
                              {date.toLocaleDateString()}
                            </td>
                            <td className="border border-border p-3 text-center">
                              {point.day}
                            </td>
                            <td className="border border-border p-3 text-center font-medium">
                              {point.actual}%
                            </td>
                            <td className="border border-border p-3 text-center text-muted-foreground">
                              {point.predicted}%
                            </td>
                            <td className={`border border-border p-3 text-center ${
                              variance >= 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {variance > 0 ? '+' : ''}{variance}%
                            </td>
                            <td className="border border-border p-3">
                              {variance >= 0 ? 'Ahead of schedule' : 'Behind schedule'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Summary Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{patientData.currentHealing}%</div>
                    <div className="text-muted-foreground">Current Healing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">+{patientData.improvement}%</div>
                    <div className="text-muted-foreground">Improvement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">{patientData.estimatedDays}</div>
                    <div className="text-muted-foreground">Days Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{patientData.severity}</div>
                    <div className="text-muted-foreground">Severity Level</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WoundResultPage;
