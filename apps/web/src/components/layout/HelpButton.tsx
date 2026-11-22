import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';

interface HelpTopic {
  title: string;
  points: string[];
}

// Short help for each screen (SRS 3.1 / 2.6), matched by the first path segment.
const HELP: Record<string, HelpTopic> = {
  '': {
    title: 'Dashboard',
    points: [
      'Shows your patients, beds and open alerts for the current shift.',
      'Live means updates arrive by themselves; Reconnecting or Offline means they do not.',
    ],
  },
  admissions: {
    title: 'Admissions',
    points: [
      'New admission needs only care pathway, gestation (20-44 weeks), risk flags or None, bed and attending doctor.',
      'Name, NIC and phone are optional and can be added later.',
      'If the bed is taken while you type, your entries stay and the free beds are listed again.',
    ],
  },
  beds: {
    title: 'Ward board',
    points: [
      'Each bed shows its status in text and colour: Available, Occupied, Cleaning or Out of service.',
      'After discharge a bed goes to Cleaning. Mark it cleaned to make it Available again.',
      'TIMED-OUT means the doctor did not acknowledge the alert: phone the number shown.',
    ],
  },
  observations: {
    title: 'Observations',
    points: [
      'Record at least one value. Impossible values are rejected.',
      'Out-of-range values are marked with a warning symbol and text. They never alert the doctor by themselves.',
      'Entries cannot be edited. Use Amend to add a linked correction.',
    ],
  },
  alerts: {
    title: 'Emergency alerts',
    points: [
      'Escalate: choose a reason, then confirm. The care plan becomes Emergency Cesarean and the attending doctor is alerted.',
      'Each alert shows Dispatched, Delivered and Acknowledged with times.',
      'Only a doctor can reverse an escalation, with a reason.',
    ],
  },
  staff: {
    title: 'Staff accounts',
    points: [
      'Create, edit, deactivate or reactivate staff. The temporary password is shown once.',
      'Deactivated staff are signed out on all devices within seconds.',
    ],
  },
  analytics: {
    title: 'Reports',
    points: [
      'Reports never include patient names, NIC or phone numbers.',
      'Export as CSV or use Print to save as PDF.',
    ],
  },
  audit: {
    title: 'Audit log',
    points: ['Every login, account change, emergency access, plan change, alert update and discharge is recorded and cannot be changed.'],
  },
};

const FALLBACK: HelpTopic = {
  title: 'Help',
  points: ['Use the menu to move between screens. Contact the ward administrator for account problems.'],
};

export const HelpButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const topic = HELP[pathname.split('/')[1] ?? ''] ?? FALLBACK;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-500 hover:text-teal-700 hover:bg-slate-100"
        title="Help for this screen"
        aria-label="Help for this screen"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{topic.title}: help</DialogTitle>
            <DialogDescription className="sr-only">Help for this screen</DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
            {topic.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
};
