import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainPage } from './main-page';
import { commonTestProviders } from '../../testing/test-setup';

describe('MainPage', () => {
  let fixture: ComponentFixture<MainPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainPage],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(MainPage);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
