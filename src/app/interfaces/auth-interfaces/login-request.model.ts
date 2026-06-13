export interface LoginRequest {
  username: string;
  passwordHash: string;
  rememberMe?: boolean;
}
