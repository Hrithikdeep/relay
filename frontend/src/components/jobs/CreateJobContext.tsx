"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { CreateJobDialog, type CreateJobInitialValues } from "./CreateJobDialog";

interface CreateJobContextValue {
  openCreateJob: (initialValues?: CreateJobInitialValues) => void;
  /** Bumps on every successful creation, anywhere in the app - pages showing a job list depend on this to know when to refetch. */
  jobCreatedTick: number;
}

const CreateJobContext = createContext<CreateJobContextValue | null>(null);

export function useCreateJob(): CreateJobContextValue {
  const ctx = useContext(CreateJobContext);
  if (!ctx) {
    throw new Error("useCreateJob must be used within a CreateJobProvider");
  }
  return ctx;
}

export function CreateJobProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<CreateJobInitialValues | undefined>(undefined);
  const [jobCreatedTick, setJobCreatedTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const openCreateJob = useCallback((values?: CreateJobInitialValues) => {
    setInitialValues(values);
    setOpen(true);
  }, []);

  function handleCreated() {
    setJobCreatedTick((t) => t + 1);
    setToast("Job created.");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  return (
    <CreateJobContext.Provider value={{ openCreateJob, jobCreatedTick }}>
      {children}

      <CreateJobDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={handleCreated}
        initialValues={initialValues}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-md border border-success/40 bg-card px-4 py-2.5 text-sm text-foreground shadow-lg">
          <CircleCheck className="h-4 w-4 text-success" />
          {toast}
        </div>
      )}
    </CreateJobContext.Provider>
  );
}

export default CreateJobProvider;
