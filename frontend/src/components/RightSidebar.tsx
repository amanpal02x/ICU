import { useState } from "react";
import { UserRole } from "@/hooks/useRole";
import { ServerPatientData, PatientNote } from "@/types/patientData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BellRing, X, Plus } from "lucide-react";
import { NewNoteForm } from "./NewNote";

export interface Alarm {
  id: string;
  patientId: string;
  patientName: string;
  type: "CRITICAL" | "WARNING";
  message: string;
  timestamp: Date;
  room: string;
}

interface RightSidebarProps {
  alarms: Alarm[];
  onAcknowledgeAlarm: (alarmId: string) => void;
  patient: ServerPatientData;
  notes: PatientNote[];
  onAddNote: (
    newNoteData: Omit<PatientNote, "id" | "patientId" | "timestamp"> & {
      timestamp: Date;
    }
  ) => void;
  role: UserRole;
}

const RightSidebar = ({
  alarms,
  onAcknowledgeAlarm,
  patient,
  notes,
  onAddNote,
  role,
}: RightSidebarProps) => {
  const [activeTab, setActiveTab] = useState("alarms");

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  const patientAlarms = alarms.filter(
    (alarm) => alarm.patientId === patient.patient_id
  );

  const patientNotes = notes
    .filter((note) => note.patientId === patient.patient_id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="bg-card h-full overflow-hidden flex flex-col">
      <Tabs
        defaultValue="alarms"
        className="flex flex-col h-full"
        value={activeTab}
        onValueChange={setActiveTab}>
        <div className="p-4 border-b border-border">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alarms">Alerts</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
        </div>

        {/* --- ALERTS TAB --- */}
        <TabsContent value="alarms" className="flex-1 overflow-y-auto m-0">
          <div className="p-0">
            {patientAlarms.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No active alarms for {patient.name}.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {patientAlarms.map((alarm) => (
                  <li
                    key={alarm.id}
                    className={`p-4 ${
                      alarm.type === "CRITICAL"
                        ? "bg-destructive/10"
                        : "bg-warning/10"
                    }`}>
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          alarm.type === "CRITICAL"
                            ? "bg-destructive"
                            : "bg-warning"
                        } text-destructive-foreground`}>
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{alarm.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {alarm.patientName} • {alarm.room}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {alarm.timestamp.toLocaleTimeString()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 px-2"
                          onClick={() => onAcknowledgeAlarm(alarm.id)}>
                          <X className="w-3 h-3 mr-1" />
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* --- NOTES TAB --- */}
        <TabsContent value="notes" className="flex-1 overflow-y-auto m-0 p-4">
          {role === "doctor" && (
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-card">
                <DialogHeader>
                  <DialogTitle>Add New Note</DialogTitle>
                </DialogHeader>
                <NewNoteForm
                  patientName={patient.name}
                  onOpenChange={setIsNoteDialogOpen}
                  onAddNote={onAddNote}
                />
              </DialogContent>
            </Dialog>
          )}

          <div className="space-y-3">
            {patientNotes.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No notes for {patient.name}.
              </div>
            ) : (
              patientNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-secondary p-3 rounded-lg border border-border">
                  <p className="text-sm text-foreground mb-2">{note.note}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-primary">
                      {note.doctorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {note.timestamp.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RightSidebar;
