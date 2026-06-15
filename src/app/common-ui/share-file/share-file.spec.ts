import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareFile } from './share-file';
import { commonTestProviders } from '../../testing/test-setup';

describe('ShareFile', () => {
  let fixture: ComponentFixture<ShareFile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareFile],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(ShareFile);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
