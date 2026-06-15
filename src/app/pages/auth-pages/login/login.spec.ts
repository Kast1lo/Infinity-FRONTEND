import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { commonTestProviders } from '../../../testing/test-setup';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(Login);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
