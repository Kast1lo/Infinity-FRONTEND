import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareFile } from './share-file';

describe('ShareFile', () => {
  let component: ShareFile;
  let fixture: ComponentFixture<ShareFile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareFile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareFile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
