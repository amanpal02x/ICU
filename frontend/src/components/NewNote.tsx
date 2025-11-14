import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PatientNote } from "@/types/patientData";
import { Label } from "../../npm/label";

// Schema for form validation
const noteFormSchema = z.object({
  doctorName: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  note: z.string().min(10, {
    message: "Note must be at least 10 characters.",
  }),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NewNoteFormProps {
  patientName: string;
  onOpenChange: (open: boolean) => void;
  onAddNote: (
    data: Omit<PatientNote, "id" | "patientId" | "timestamp"> & {
      timestamp: Date;
    }
  ) => void;
}

export function NewNoteForm({
  patientName,
  onOpenChange,
  onAddNote,
}: NewNoteFormProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      doctorName: "",
      note: "",
    },
  });

  function onSubmit(data: NoteFormValues) {
    onAddNote({
      doctorName: data.doctorName,
      note: data.note,
      timestamp: currentTime,
    });
    onOpenChange(false); // Close the dialog on submit
    form.reset();
  }

  // Update time when dialog opens, but not while typing
  React.useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Patient Name (Display Only) */}
        <div>
          <Label>Patient</Label>
          <p className="text-sm font-medium text-foreground">{patientName}</p>
        </div>

        {/* Timestamp (Display Only) */}
        <div>
          <Label>Time</Label>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleString()}
          </p>
        </div>

        {/* Doctor Name Input */}
        <FormField
          control={form.control}
          name="doctorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doctor Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Note Textarea */}
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter clinical note..."
                  className="resize-none"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit">Submit Note</Button>
        </div>
      </form>
    </Form>
  );
}
