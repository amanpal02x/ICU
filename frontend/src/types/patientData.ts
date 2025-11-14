export interface ServerVital {
  value: string; // The value is a string, "nan" is possible
  status: "stable" | "warning" | "critical";
}

export interface ServerVitals {
  "HR": ServerVital;
  "RR": ServerVital;
  "SpO₂": ServerVital; 
  "SBP": ServerVital;
  "DBP": ServerVital;
  [key: string]: ServerVital;
}

// Type for an individual alarm from the server
export interface ServerAlarm {
  patient_id: string;
  vital: string;
  level: "CRITICAL" | "WARNING"; 
  value: string;
}

export interface ServerAIPrediction {
  risk_score_percent: number;
  is_at_risk: boolean;
}

// Type for the main patient data object from the WebSocket
export interface ServerPatientData {
  patient_id: string; 
  name: string;
  room: string;
  vitals: ServerVitals;
  alarms: ServerAlarm[];
  ai_prediction: ServerAIPrediction;
}

export interface PatientNote {
  id: string;
  patientId: string;
  doctorName: string;
  note: string;
  timestamp: Date;
}

export type WebSocketMessage = ServerPatientData[];