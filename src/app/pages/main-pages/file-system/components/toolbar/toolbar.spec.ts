import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toolbar } from './toolbar';
import { commonTestProviders } from '../../../../../testing/test-setup';

describe('Toolbar', () => {
  let fixture: ComponentFixture<Toolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toolbar],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(Toolbar);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
