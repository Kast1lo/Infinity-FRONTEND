import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileCard } from './profile-card';
import { commonTestProviders } from '../../../../testing/test-setup';

describe('ProfileCard', () => {
  let fixture: ComponentFixture<ProfileCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCard],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileCard);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
