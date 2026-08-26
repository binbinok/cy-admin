import { create } from 'zustand';

export interface IncomePrefillData {
  appointmentId?: string;
  serviceId?: string;
  serviceName?: string;
  serviceCategory?: string;
  categoryId?: string;
  categoryName?: string;
  duration?: number;
  technicianId?: string;
  memberId?: string;
  guestName?: string;
  serviceTime?: string;
  note?: string;
}

interface IncomePrefillState {
  prefillData: IncomePrefillData | null;
}

interface IncomePrefillActions {
  setIncomePrefill: (data: IncomePrefillData) => void;
  clearIncomePrefill: () => void;
}

type IncomePrefillStore = IncomePrefillState & IncomePrefillActions;

export const useIncomePrefillStore = create<IncomePrefillStore>((set) => ({
  prefillData: null,
  setIncomePrefill: (data) => set({ prefillData: data }),
  clearIncomePrefill: () => set({ prefillData: null }),
}));