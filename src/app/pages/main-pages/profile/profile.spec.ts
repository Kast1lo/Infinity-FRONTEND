import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Profile } from './profile';
import { commonTestProviders } from '../../../testing/test-setup';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(Profile);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
