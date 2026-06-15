import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { commonTestProviders } from './testing/test-setup';

describe('App', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(App);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
