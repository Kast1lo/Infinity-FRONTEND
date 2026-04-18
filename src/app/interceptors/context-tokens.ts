import { HttpContextToken } from '@angular/common/http';
import { RETRY_TOKEN } from './context-tokens';

export const RETRY_TOKEN = new HttpContextToken<boolean>(() => false);
