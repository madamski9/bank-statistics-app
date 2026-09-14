import type { DeliveryLane } from './app-environment';

export function assertApplicationMatchesLane(
  lane: DeliveryLane,
  expectedApplicationId: string | undefined,
  actualApplicationId: string | null,
): void {
  if (expectedApplicationId === undefined || actualApplicationId === null) {
    return;
  }

  if (expectedApplicationId !== actualApplicationId) {
    throw new Error(
      `${lane} lane expects ${expectedApplicationId} but is running in ${actualApplicationId}, which was built for a different lane.`,
    );
  }
}
