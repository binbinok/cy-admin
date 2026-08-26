import cloudbase from '@cloudbase/js-sdk';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse } from '@/types/common';

const TOKEN_KEY = 'admin_token';
const ADMIN_INFO_KEY = 'admin_info';
const DEFAULT_CLOUDBASE_ENV_ID = 'cloud1-1g7yz5w766dd366f';
const INVOKE_PREFIX = '/invoke/';

interface FunctionCallResult<T> {
  result?: T;
}

interface HttpResponse<T> {
  data: T;
}

interface HttpClient {
  post<T>(url: string, data?: Record<string, unknown>): Promise<HttpResponse<T>>;
}

const cloudbaseEnvId: string =
  (import.meta.env.VITE_CLOUDBASE_ENV_ID as string | undefined) || DEFAULT_CLOUDBASE_ENV_ID;

/**
 * 云函数 API 同源代理前缀。生产环境默认经 Nginx 反向代理（/api/cloud/）访问，
 * 规避浏览器对 tcb-api.tencentcloudapi.com 的跨域拦截；显式置空可回退为直连。
 */
const cloudbaseApiPrefix: string =
  (import.meta.env.VITE_CLOUDBASE_API_PREFIX as string | undefined) ??
  (import.meta.env.PROD ? '/api/cloud' : '');

const app = cloudbase.init({
  env: cloudbaseEnvId,
});
/**
 * js-sdk 运行时提供 registerEndPoint 用于覆盖 API 端点，但 App 类型未声明
 */
interface CloudbaseAppWithEndPoint {
  registerEndPoint: (url: string) => void;
}

if (cloudbaseApiPrefix) {
  (app as unknown as CloudbaseAppWithEndPoint).registerEndPoint(
    `${window.location.origin}${cloudbaseApiPrefix}/web`,
  );
}

interface AuthInitOptions {
  persistence: 'session';
  apiPath?: string;
}

const authOptions: AuthInitOptions = { persistence: 'session' };
if (cloudbaseApiPrefix) {
  authOptions.apiPath = `${cloudbaseApiPrefix}/auth`;
}
const auth = app.auth(authOptions as { persistence: 'session' });
let authReadyPromise: Promise<void> | null = null;

/**
 * 业务错误类型，携带错误码标识
 */
export interface BusinessError extends Error {
  code: string;
  isBusinessError: boolean;
}

/**
 * 判断是否为业务错误
 */
export function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof Error && (error as BusinessError).isBusinessError === true;
}

/**
 * 解析云函数名称
 */
function parseFunctionName(url: string): string {
  if (!url.startsWith(INVOKE_PREFIX)) {
    throw new Error('仅支持 /invoke/{函数名} 调用格式');
  }
  const functionName = url.slice(INVOKE_PREFIX.length).trim();
  if (!functionName) {
    throw new Error('云函数名称不能为空');
  }
  return functionName;
}

/**
 * 确保 CloudBase 登录态可用（未登录时自动匿名登录）
 */
async function ensureCloudbaseLoginState(): Promise<void> {
  if (authReadyPromise) {
    await authReadyPromise;
    return;
  }
  authReadyPromise = (async (): Promise<void> => {
    const loginState = auth.hasLoginState();
    if (loginState) {
      return;
    }
    await auth.signInAnonymously();
  })();
  try {
    await authReadyPromise;
  } catch (error: unknown) {
    authReadyPromise = null;
    throw error;
  }
}

/**
 * 构造云函数参数（包含鉴权上下文）
 */
function buildFunctionPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };
  const token = localStorage.getItem(TOKEN_KEY);
  const { adminInfo } = useAuthStore.getState();
  if (token) {
    payload.authorization = `Bearer ${token}`;
    payload.token = token;
  }
  if (adminInfo?.adminId) {
    payload.adminId = adminInfo.adminId;
  }
  return payload;
}

/**
 * 创建业务错误对象
 */
function createBusinessError(code: string, message: string): BusinessError {
  const businessError = new Error(message) as BusinessError;
  businessError.code = code;
  businessError.isBusinessError = true;
  return businessError;
}

/**
 * 处理未授权响应
 */
function handleUnauthorized(): never {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
  const { clearAuth } = useAuthStore.getState();
  clearAuth();
  window.location.href = '/login';
  throw new Error('登录已过期，请重新登录');
}

/**
 * 统一处理云函数业务响应
 */
function handleApiResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
  if (response.success) {
    return response;
  }
  const errorCode = response.error?.code || 'INTERNAL_ERROR';
  const errorMessage = response.error?.message || '操作失败，请稍后重试';
  if (errorCode === 'UNAUTHORIZED') {
    handleUnauthorized();
  }
  if (errorCode === 'FORBIDDEN') {
    throw new Error('权限不足，请联系超级管理员');
  }
  throw createBusinessError(errorCode, errorMessage);
}

/**
 * 通过 cloudbase/js-sdk 调用云函数
 */
async function post<T>(url: string, data: Record<string, unknown> = {}): Promise<HttpResponse<T>> {
  try {
    await ensureCloudbaseLoginState();
    const functionName = parseFunctionName(url);
    const payload = buildFunctionPayload(data);
    const response = (await app.callFunction({
      name: functionName,
      data: payload,
    })) as FunctionCallResult<ApiResponse<unknown>>;
    const result = (response.result || {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '云函数返回数据格式异常' },
    }) as ApiResponse<unknown>;
    const apiResponse = handleApiResponse(result) as T;
    return { data: apiResponse };
  } catch (error: unknown) {
    if (isBusinessError(error) || error instanceof Error) {
      throw error;
    }
    throw new Error('网络异常，请稍后重试');
  }
}

const http: HttpClient = {
  post,
};

export default http;
