import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListFiles } from './list-files';
import { commonTestProviders } from '../../../../../testing/test-setup';

describe('ListFiles', () => {
  let fixture: ComponentFixture<ListFiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListFiles],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(ListFiles);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
