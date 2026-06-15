import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileSystem } from './file-system';
import { commonTestProviders } from '../../../testing/test-setup';

describe('FileSystem', () => {
  let fixture: ComponentFixture<FileSystem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileSystem],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(FileSystem);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
