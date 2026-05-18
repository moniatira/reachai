export { loadConfig } from './lib/config.js';
export { getAccessToken, clearTokenCache } from './lib/oauth.js';
export {
  listBookedAppointments,
  listBookedAppointmentsMultiDept,
  listOpenAppointmentSlots,
  getAppointment,
  bookAppointment,
} from './lib/appointments.js';
