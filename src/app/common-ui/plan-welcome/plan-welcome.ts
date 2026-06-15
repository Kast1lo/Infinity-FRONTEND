import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { LangService } from '../../services/lang';

export type PlanKind = 'spark' | 'pulse' | 'horizon' | 'eternal';

@Component({
  selector: 'app-plan-welcome',
  imports: [DialogModule],
  templateUrl: './plan-welcome.html',
  styleUrl: './plan-welcome.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanWelcome {
  private readonly lang = inject(LangService);

  /** Тариф, возможности которого показываем. */
  plan = input<PlanKind>('spark');
  /** Видимость окна (two-way). */
  visible = model(false);
  /** Нажата основная кнопка («Начать работу»). */
  confirm = output<void>();

  t    = computed(() => this.lang.t().planWelcome);
  data = computed(() => this.t().plans[this.plan()]);

  // Иконка + акцентный цвет под каждый тариф — вся палитра в тёплой
  // оранжевой гамме бренда (#ff7a00), оттенки различимы между собой.
  // У Eternal — иконка infinity из Lucide (в PrimeIcons нет pi-infinity).
  private static readonly THEME: Record<PlanKind, { icon?: string; infinity?: boolean; accent: string }> = {
    spark:   { icon: 'pi-bolt',    accent: '#ff7a00' }, // фирменный оранжевый
    pulse:   { icon: 'pi-send',    accent: '#ffa733' }, // светлый янтарь
    horizon: { icon: 'pi-compass', accent: '#ff5c2e' }, // коралл / красно-оранжевый
    eternal: { infinity: true,     accent: '#d4b84a' }, // золотистый (как шкала хранилища)
  };

  theme = computed(() => PlanWelcome.THEME[this.plan()]);

  onConfirm(): void {
    this.visible.set(false);
    this.confirm.emit();
  }
}
