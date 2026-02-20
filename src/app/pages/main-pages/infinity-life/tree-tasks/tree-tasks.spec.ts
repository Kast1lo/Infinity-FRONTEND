import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeTasks } from './tree-tasks';

describe('TreeTasks', () => {
  let component: TreeTasks;
  let fixture: ComponentFixture<TreeTasks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeTasks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeTasks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
