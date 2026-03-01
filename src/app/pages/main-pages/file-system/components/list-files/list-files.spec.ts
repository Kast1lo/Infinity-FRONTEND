import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListFiles } from './list-files';

describe('ListFiles', () => {
  let component: ListFiles;
  let fixture: ComponentFixture<ListFiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListFiles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListFiles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
