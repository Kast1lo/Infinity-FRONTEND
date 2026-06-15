import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfinityLife } from './infinity-life';
import { commonTestProviders } from '../../../testing/test-setup';

describe('InfinityLife', () => {
  let fixture: ComponentFixture<InfinityLife>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfinityLife],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(InfinityLife);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
