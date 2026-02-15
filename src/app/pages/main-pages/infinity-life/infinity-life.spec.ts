import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfinityLife } from './infinity-life';

describe('InfinityLife', () => {
  let component: InfinityLife;
  let fixture: ComponentFixture<InfinityLife>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfinityLife]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfinityLife);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
