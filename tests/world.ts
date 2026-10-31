/**
 * FrankenLab — the test world.
 *
 * The tests build exactly the same registry the product does. If they ever
 * drift apart, a passing test stops meaning anything.
 */

export { createWorld as createTestRegistry, DISCIPLINE_COLOURS, DISCIPLINE_ORDER } from '../src/world';
