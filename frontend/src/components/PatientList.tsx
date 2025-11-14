import { Search } from "lucide-react";
import { useRef } from "react";
import { ServerPatientData } from "@/types/patientData";

interface PatientListProps {
  patients: ServerPatientData[];
  selectedPatient: ServerPatientData | null; // Allow null for initial load
  onSelectPatient: (patient: ServerPatientData) => void;
  onLockPatient?: (patient: ServerPatientData) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  listOffset?: number;
}

const PatientList = ({
  patients,
  selectedPatient,
  onSelectPatient,
  onLockPatient,
  searchTerm,
  setSearchTerm,
  listOffset = 0,
}: PatientListProps) => {
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.room.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show 10 patients: selected patient first, then fill with cycling groups
  const displayedPatients = searchTerm === ""
    ? (() => {
        const otherPatients = patients.filter(p => p.patient_id !== selectedPatient?.patient_id);
        const cyclingPatients = otherPatients.slice(listOffset, listOffset + 9);
        return selectedPatient ? [selectedPatient, ...cyclingPatients] : cyclingPatients.slice(0, 10);
      })()
    : filteredPatients.slice(0, 10);

  const getStatusColor = (patient: ServerPatientData) => {
    // Check vitals status directly from the server data
    const vitals = Object.values(patient.vitals);
    if (vitals.some((v) => v.status === "critical")) return "bg-destructive";
    if (vitals.some((v) => v.status === "warning")) return "bg-warning";
    return "bg-success";
  };

  const clickTimestamps = useRef<{ [key: string]: number }>({});

  const handlePatientClick = (patient: ServerPatientData) => {
    const now = Date.now();
    const lastClick = clickTimestamps.current[patient.patient_id] || 0;
    const timeDiff = now - lastClick;

    // Double click detection (within 300ms)
    if (timeDiff < 300 && onLockPatient) {
      onLockPatient(patient);
    } else {
      onSelectPatient(patient);
    }

    clickTimestamps.current[patient.patient_id] = now;
  };

  const renderPatientItem = (patient: ServerPatientData) => (
    <button
      key={patient.patient_id}
      onClick={() => handlePatientClick(patient)}
      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
        selectedPatient?.patient_id === patient.patient_id // Use optional chaining
          ? "bg-primary text-primary-foreground"
          : "hover:bg-secondary"
      }`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${getStatusColor(patient)}`}></div>
        <div className="flex-1">
          <div className="text-sm font-medium">{patient.name}</div>
          <div className="text-xs opacity-70">{patient.room}</div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="bg-card h-full overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">PATIENTS</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">
            ALL PATIENTS
          </h3>
          <div className="space-y-1">
            {displayedPatients.map(renderPatientItem)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientList;
