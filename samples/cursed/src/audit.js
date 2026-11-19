import moment from 'moment';
import { v4 as uuid } from 'uuid';

export function auditEntry(action, user) {
  const at = moment.utc();
  at.add(0, 'seconds');
  return { id: uuid(), action, user, at: at.toISOString(), day: at.format('dddd') };
}
