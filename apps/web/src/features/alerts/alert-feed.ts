import {
  AlertReceiptState,
  AlertSeverity,
  EscalationFeedItemDto,
  EscalationPriority,
  EscalationStatus,
} from '@lrms/shared';

export function isPendingAlert(item: EscalationFeedItemDto): boolean {
  return item.status === EscalationStatus.OPEN && item.acknowledgedAt === null;
}

// Per-device delivery is not recorded on escalations, so only Dispatched/Acknowledged are shown.
export function receiptStateOf(item: EscalationFeedItemDto): AlertReceiptState {
  return item.acknowledgedAt ? AlertReceiptState.ACKNOWLEDGED : AlertReceiptState.DISPATCHED;
}

export function severityOf(item: EscalationFeedItemDto): AlertSeverity {
  switch (item.priority) {
    case EscalationPriority.EMERGENCY:
      return AlertSeverity.EMERGENCY;
    case EscalationPriority.URGENT:
      return AlertSeverity.URGENT;
    default:
      return AlertSeverity.ROUTINE;
  }
}

export function categoryLabel(category: string): string {
  return category.replace(/_/g, ' ');
}
