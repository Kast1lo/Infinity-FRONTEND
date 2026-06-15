import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Registration } from './registration';
import { commonTestProviders } from '../../../testing/test-setup';

describe('Registration', () => {
  let fixture: ComponentFixture<Registration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registration],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(Registration);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
