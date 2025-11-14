import { useState, useEffect } from 'react';
import { WebSocketMessage, ServerPatientData } from '@/types/patientData';
import { useRole } from '@/hooks/useRole';

const useWebSocket = (url: string) => {
  const [data, setData] = useState<WebSocketMessage | null>(null);
  const [filteredData, setFilteredData] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const { role } = useRole();

  useEffect(() => {
    // Ensure this runs only in the browser
    if (typeof window === 'undefined') return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data) as WebSocketMessage;
        console.log('WebSocket received data:', messageData);
        setData(messageData);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError(err);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    // Cleanup on component unmount
    return () => {
      ws.close();
    };
  }, [url]); // Re-run effect if URL changes

  // Filter data based on user role
  useEffect(() => {
    if (!data) {
      setFilteredData(null);
      return;
    }

    // If role is not loaded yet, show all data for testing/development
    if (!role) {
      console.log('Role not loaded yet, showing all data for testing');
      setFilteredData(data);
      return;
    }

    let filteredPatients: ServerPatientData[] = [];

    switch (role) {
      case 'admin':
        // Admins can see all patients
        filteredPatients = data;
        break;

      case 'doctor':
        // Doctors can see all patients (temporary setup as requested)
        filteredPatients = data;
        break;

      case 'nurse':
        // TEMPORARY: Allow nurses to see all patients for testing
        // TODO: Implement patient assignment logic
        filteredPatients = data;
        break;

      default:
        filteredPatients = [];
    }

    setFilteredData(filteredPatients);
  }, [data, role]);

  return { data: filteredData, error };
};

export default useWebSocket;
