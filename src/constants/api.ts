/**
 * 云函数名称常量
 * 所有管理端云函数通过 cloudbase/js-sdk 调用
 */

// 认证模块
export const CF_ADMIN_LOGIN = 'adminLogin';
export const CF_ADMIN_LOGOUT = 'adminLogout';
export const CF_ADMIN_CHANGE_PASSWORD = 'adminChangePassword';
export const CF_GET_ADMIN_LIST = 'getAdminList';
export const CF_CREATE_ADMIN = 'createAdmin';
export const CF_UPDATE_ADMIN_STATUS = 'updateAdminStatus';
export const CF_GET_LOGIN_LOGS = 'getLoginLogs';

// 会员模块
export const CF_GET_MEMBER_LIST = 'adminGetMemberList';
export const CF_GET_MEMBER_DETAIL = 'adminGetMemberDetail';
export const CF_CREATE_MEMBER = 'adminCreateMember';
export const CF_UPDATE_MEMBER = 'adminUpdateMember';
export const CF_GET_MEMBER_CONSUMPTIONS = 'adminGetMemberConsumptions';
export const CF_GET_BIRTHDAY_MEMBERS = 'adminGetBirthdayMembers';
export const CF_GET_DORMANT_MEMBERS = 'adminGetDormantMembers';
export const CF_SEND_BIRTHDAY_NOTIFICATION = 'adminSendBirthdayNotification';

// 技师模块
export const CF_GET_TECHNICIAN_LIST = 'adminGetTechnicianList';
export const CF_CREATE_TECHNICIAN = 'adminCreateTechnician';
export const CF_UPDATE_TECHNICIAN = 'adminUpdateTechnician';
export const CF_UPDATE_TECHNICIAN_STATUS = 'adminUpdateTechnicianStatus';
export const CF_DELETE_TECHNICIAN = 'adminDeleteTechnician';
export const CF_SET_TECHNICIAN_SCHEDULE = 'adminSetTechnicianSchedule';
export const CF_SET_TECHNICIAN_SERVICE_SLOTS = 'adminSetTechnicianServiceSlots';

// 服务项目模块
export const CF_GET_SERVICE_LIST = 'adminGetServiceList';
export const CF_GET_SERVICE_CATEGORIES = 'adminGetServiceCategories';
export const CF_CREATE_SERVICE = 'adminCreateService';
export const CF_UPDATE_SERVICE = 'adminUpdateService';
export const CF_TOGGLE_SERVICE_STATUS = 'adminToggleServiceStatus';

// 预约模块
export const CF_GET_APPOINTMENT_LIST = 'adminGetAppointmentList';
export const CF_CREATE_APPOINTMENT = 'adminCreateAppointment';
export const CF_CONFIRM_ARRIVAL = 'adminConfirmArrival';
export const CF_COMPLETE_SERVICE = 'adminCompleteService';
export const CF_CANCEL_APPOINTMENT = 'adminCancelAppointment';

// 财务模块
export const CF_GET_FINANCE_SUMMARY = 'adminGetFinanceSummary';
export const CF_GET_REVENUE_TREND = 'adminGetRevenueTrend';
export const CF_GET_SERVICE_REVENUE = 'adminGetServiceRevenue';
export const CF_GET_CONSUMPTION_LIST = 'adminGetConsumptionList';
export const CF_GET_TECHNICIAN_PERFORMANCE = 'adminGetTechnicianPerformance';
export const CF_GET_TECHNICIAN_INCOME_DETAIL = 'adminGetTechnicianIncomeDetail';
export const CF_CREATE_INCOME_RECORD = 'adminCreateIncomeRecord';
export const CF_EXPORT_PAYROLL = 'adminExportPayroll';

// 提成模块
export const CF_GET_COMMISSION_REPORT = 'adminGetCommissionReport';
export const CF_GET_COMMISSION_CONFIG = 'adminGetCommissionConfig';
export const CF_UPDATE_COMMISSION_RATE = 'adminUpdateCommissionRate';

// 会员卡模块
export const CF_GET_DISCOUNT_LEVELS = 'adminGetDiscountLevels';
export const CF_CREATE_DISCOUNT_LEVEL = 'adminCreateDiscountLevel';
export const CF_UPDATE_DISCOUNT_LEVEL = 'adminUpdateDiscountLevel';
export const CF_DELETE_DISCOUNT_LEVEL = 'adminDeleteDiscountLevel';
export const CF_ASSIGN_DISCOUNT_LEVEL = 'adminAssignDiscountLevel';
export const CF_RECHARGE_CARD = 'adminRechargeCard';
export const CF_GET_CARD_RECHARGE_RECORDS = 'adminGetCardRechargeRecords';
export const CF_DEDUCT_CARD_BALANCE = 'adminDeductCardBalance';
export const CF_BIND_MEMBER_CARD = 'adminBindMemberCard';
export const CF_UNBIND_MEMBER_CARD = 'adminUnbindMemberCard';
export const CF_GET_MEMBER_CARD_ASSOCIATION = 'adminGetMemberCardAssociation';

// 操作日志模块
export const CF_GET_OPERATION_LOGS = 'adminGetOperationLogs';
