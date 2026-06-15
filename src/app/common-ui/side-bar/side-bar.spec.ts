import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SideBar } from './side-bar';
import { commonTestProviders } from '../../testing/test-setup';

describe('SideBar', () => {
  let fixture: ComponentFixture<SideBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideBar],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(SideBar);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
