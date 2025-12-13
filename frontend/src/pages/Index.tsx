import { useState, useEffect } from "react";
import {
  ServerPatientData,
  ServerAlarm as WSServerAlarm,
  PatientNote,
} from "@/types/patientData";
import useWebSocket from "@/hooks/usePatientData";
import { useRole } from "@/hooks/useRole";

import Header from "@/components/Header";
import PatientList from "@/components/PatientList";
import MainDashboard from "@/components/MainDashboard";
import RightSidebar, { Alarm } from "@/components/RightSidebar";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users, FileText } from "lucide-react";

const MOCK_NOTES: PatientNote[] = [
  {
    id: "note-1",
    patientId: "1",
    doctorName: "Dr. Anya Sharma",
    note: "Patient reported slight dizziness post-medication. Vitals remained stable. Monitoring closely.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "note-2",
    patientId: "2",
    doctorName: "Dr. Kenji Tanaka",
    note: "Morning rounds. Patient is responsive and alert. No new complaints.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
  },
  {
    id: "note-3",
    patientId: "4",
    doctorName: "Dr. Emily Reed",
    note: "Family visit completed. Patient's mood seems improved.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
];

const Index = () => {
  const [patientsData, setPatientsData] = useState<ServerPatientData[]>([]);
  const [selectedPatient, setSelectedPatient] =
    useState<ServerPatientData | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isManuallyLocked, setIsManuallyLocked] = useState(false);
  const [patientListOffset, setPatientListOffset] = useState(0);

  const [notes, setNotes] = useState<PatientNote[]>(MOCK_NOTES);

  const { role } = useRole();

  const WEBSOCKET_URL = import.meta.env.DEV ? 'ws://localhost:8000/ws' : (import.meta.env.VITE_API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + "/ws");
  const { data: wsData, error: wsError } = useWebSocket(WEBSOCKET_URL);

  useEffect(() => {
    if (wsData) {
      const updatedPatients = wsData;
      setPatientsData(updatedPatients);

      const newAlarms: Alarm[] = [];
      wsData.forEach((serverPatient) => {
        serverPatient.alarms.forEach((serverAlarm: WSServerAlarm) => {
          newAlarms.push({
            id: `${serverAlarm.patient_id}-${
              serverAlarm.vital
            }-${new Date().getTime()}`,
            patientId: serverAlarm.patient_id,
            patientName: serverPatient.name,
            type: serverAlarm.level,
            message: `${serverAlarm.vital} ${serverAlarm.level} - Value: ${serverAlarm.value}`,
            timestamp: new Date(),
            room: serverPatient.room,
          });
        });
      });
      setAlarms(newAlarms);

      if (selectedPatient) {
        const updatedSelected = updatedPatients.find(
          (p) => p.patient_id === selectedPatient.patient_id
        );
        if (updatedSelected) {
          setSelectedPatient(updatedSelected);
        }
      } else if (updatedPatients.length > 0) {
        // If no patient is selected, select the first one
        setSelectedPatient(updatedPatients[0]);
      }
    }
  }, [wsData, selectedPatient]);

  // Auto-cycle through patients every 10 seconds (only when not searching and not manually locked)
  useEffect(() => {
    if (patientsData.length > 1 && searchTerm === "" && !isManuallyLocked) {
      const interval = setInterval(() => {
        setSelectedPatient((currentPatient) => {
          if (!currentPatient) return patientsData[0];

          const currentIndex = patientsData.findIndex(
            (p) => p.patient_id === currentPatient.patient_id
          );
          const nextIndex = (currentIndex + 1) % patientsData.length;
          return patientsData[nextIndex];
        });

        // Also cycle the patient list offset for groups of 10
        setPatientListOffset((currentOffset) => {
          const totalPatients = patientsData.length;
          const nextOffset = (currentOffset + 10) % totalPatients;
          return nextOffset;
        });
      }, 2000); //

      return () => clearInterval(interval);
    }
  }, [patientsData, searchTerm, isManuallyLocked]);

  // WebSocket error
  useEffect(() => {
    if (wsError) {
      console.error("WebSocket connection error:", wsError);
    }
  }, [wsError]);

  const handleAcknowledgeAlarm = (alarmId: string) => {
    setAlarms((prev) => prev.filter((alarm) => alarm.id !== alarmId));
  };

  const handleAddNote = (
    newNoteData: Omit<PatientNote, "id" | "patientId" | "timestamp"> & {
      timestamp: Date;
    }
  ) => {
    if (!selectedPatient) return;
    const newNote: PatientNote = {
      ...newNoteData,
      id: `note-${Date.now()}`,
      patientId: selectedPatient.patient_id,
    };
    setNotes((prevNotes) => [newNote, ...prevNotes]);
  };

  const handleLockPatient = (patient: ServerPatientData) => {
    setSelectedPatient(patient);
    setIsManuallyLocked(true);
  };

  const handleUnlockCycling = () => {
    setIsManuallyLocked(false);
  };

  // Loading state
  if (patientsData.length === 0 || !selectedPatient) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <TextShimmer className="font-sans text-base" duration={1}>
          Connecting to ICU Server...
        </TextShimmer>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Header alarmCount={alarms.length} />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-16 sm:pt-20">
        {/* Left Sidebar - Patient List - Hidden on tablet and mobile */}
        <div className="hidden lg:block w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border">
          <PatientList
            patients={patientsData}
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
            onLockPatient={handleLockPatient}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            listOffset={patientListOffset}
          />
        </div>

        {/* Main Dashboard */}
        <div className="flex-1 overflow-hidden cursor-pointer min-h-0 relative">
          <MainDashboard patient={selectedPatient} onToggleLock={() => setIsManuallyLocked(!isManuallyLocked)} />

          {/* Mobile/Tablet Floating Action Buttons */}
          <div className="lg:hidden fixed bottom-6 right-6 flex flex-col gap-3 z-40">
            {/* Patient Search Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="lg"
                  className="rounded-full w-14 h-14 shadow-lg"
                  aria-label="Search Patients"
                >
                  <Users className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-80 p-0">
                <PatientList
                  patients={patientsData}
                  selectedPatient={selectedPatient}
                  onSelectPatient={setSelectedPatient}
                  onLockPatient={handleLockPatient}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  listOffset={patientListOffset}
                />
              </SheetContent>
            </Sheet>

            {/* Notes Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="lg"
                  className="rounded-full w-14 h-14 shadow-lg"
                  aria-label="View Notes"
                >
                  <FileText className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-80 p-0">
                <RightSidebar
                  alarms={alarms}
                  onAcknowledgeAlarm={handleAcknowledgeAlarm}
                  patient={selectedPatient}
                  notes={notes}
                  onAddNote={handleAddNote}
                  role={role}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Right Sidebar - Alarms & History - Hidden on tablet and mobile */}
        <div className="hidden lg:block w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border">
          <RightSidebar
            alarms={alarms}
            onAcknowledgeAlarm={handleAcknowledgeAlarm}
            patient={selectedPatient}
            notes={notes}
            onAddNote={handleAddNote}
            role={role}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
