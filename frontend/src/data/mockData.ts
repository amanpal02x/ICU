import { ServerVitals, ServerAIPrediction } from "@/types/patientData";

export const VITAL_RANGES = {
  heartRate: {
    normal: [60, 100],
    warning: [50, 110],
    critical: [40, 130],
  },
  systolic: {
    normal: [90, 120],
    warning: [80, 140],
    critical: [70, 160],
  },
  diastolic: {
    normal: [60, 80],
    warning: [50, 90],
    critical: [40, 100],
  },
  temp: {
    normal: [36.5, 37.5],
    warning: [36, 38],
    critical: [35, 39],
  },
  respirate: {
    normal: [12, 20],
    warning: [10, 24],
    critical: [8, 28],
  },
  spO2: {
    normal: [95, 100],
    warning: [90, 95],
    critical: [0, 90],
  },
  etco2: {
    normal: [35, 45],
    warning: [30, 50],
    critical: [25, 55],
  },
};

export interface Patient {
  id: string;
  name: string;
  room: string;
  vitals: ServerVitals;
  aiPrediction: ServerAIPrediction;
}
