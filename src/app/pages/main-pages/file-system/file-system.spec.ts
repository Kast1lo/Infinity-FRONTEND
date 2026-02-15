import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileSystem } from './file-system';

describe('FileSystem', () => {
  let component: FileSystem;
  let fixture: ComponentFixture<FileSystem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileSystem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileSystem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
