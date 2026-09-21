import * as migration_20260210_080957 from './20260210_080957';
import * as migration_20260226_085456 from './20260226_085456';
import * as migration_20260725_123516 from './20260725_123516';
import * as migration_20260915_add_subscribers from './20260915_add_subscribers';
import * as migration_20260921_model3_organiser_approval from './20260921_model3_organiser_approval';

export const migrations = [
  {
    up: migration_20260210_080957.up,
    down: migration_20260210_080957.down,
    name: '20260210_080957',
  },
  {
    up: migration_20260226_085456.up,
    down: migration_20260226_085456.down,
    name: '20260226_085456'
  },
  {
    up: migration_20260725_123516.up,
    down: migration_20260725_123516.down,
    name: '20260725_123516'
  },
  {
    up: migration_20260915_add_subscribers.up,
    down: migration_20260915_add_subscribers.down,
    name: '20260915_add_subscribers'
  },
  {
    up: migration_20260921_model3_organiser_approval.up,
    down: migration_20260921_model3_organiser_approval.down,
    name: '20260921_model3_organiser_approval'
  },
];
