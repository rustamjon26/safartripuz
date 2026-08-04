export { staffService, StaffService, StaffNotFoundError } from "./service/staff.service";
export {
  StaffContextError,
  StaffShiftStatusError,
  StaffTaskStatusError,
} from "./service/staff.service";
export { departmentFromStaffRole } from "./service/staff-context";
export { staffRoleTitle } from "./domain/staff-role-label";
export type {
  StaffContext,
  StaffProfileView,
  AdminHotelStaffView,
  ShiftView,
  TaskView,
  ThreadView,
  ChatMessageView,
  CourseView,
  ModuleView,
  StaffShiftStatus,
  StaffOpsTaskStatus,
  StaffOpsTaskPriority,
} from "./domain/types";
export {
  listShiftsQuerySchema,
  patchShiftSchema,
  listTasksQuerySchema,
  createTaskSchema,
  patchTaskSchema,
  sendMessageSchema,
  completeModuleSchema,
  patchStaffProfileSchema,
  hotelStaffJobRoleSchema,
  adminLinkHotelStaffSchema,
  adminPatchHotelStaffSchema,
  adminLinkUserToHotelSchema,
} from "./domain/validate";
