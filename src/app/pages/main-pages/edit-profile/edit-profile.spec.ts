import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditProfile } from './edit-profile';
import { commonTestProviders } from '../../../testing/test-setup';

describe('EditProfile', () => {
  let fixture: ComponentFixture<EditProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProfile],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(EditProfile);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
