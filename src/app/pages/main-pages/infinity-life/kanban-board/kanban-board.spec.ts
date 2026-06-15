import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KanbanBoard } from './kanban-board';
import { commonTestProviders } from '../../../../testing/test-setup';

describe('KanbanBoard', () => {
  let fixture: ComponentFixture<KanbanBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanBoard],
      providers: commonTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(KanbanBoard);
  });

  it('создаётся без ошибок', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
