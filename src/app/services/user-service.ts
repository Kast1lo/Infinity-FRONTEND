import { computed, Injectable, signal } from '@angular/core';
import { UserProfile } from '../interfaces/profile-interfaces/user-profile.model';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:4400/user';

  // Состояние профиля
  private _profile = signal<UserProfile | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Computed для компонентов
  profile = computed(() => this._profile());
  isLoading = computed(() => this._isLoading());
  error = computed(() => this._error());

  constructor(private http: HttpClient) {
    this.getProfile().subscribe();
  }

  getProfile(): Observable<UserProfile>{
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<UserProfile>(`${this.apiUrl}/profile`,{
      withCredentials: true
    }).pipe(
      tap(profile => {
        this._profile.set(profile);
        this._isLoading.set(false);
      }),
      catchError(err =>{
        this._isLoading.set(false);
        if(err.status === 401){
          this._profile.set(null);
        } else {
          this._error.set(err.error?.message || 'Ошибка загрузки профиля');
        }
        return throwError(()=> err)
      })
    );
  }

  clearProfile(): void{
    this._profile.set(null);
    this._error.set(null)
  }
}
