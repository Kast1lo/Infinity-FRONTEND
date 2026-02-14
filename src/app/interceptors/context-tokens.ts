import { HttpContextToken } from '@angular/common/http';

export const RETRY_TOKEN = new HttpContextToken<boolean>(() => false);