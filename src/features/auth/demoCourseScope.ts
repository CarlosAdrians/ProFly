import { demoCoordinator } from '../../mocks/coordinator';
import { coordinatorLoginEmail } from '../account/services/coordinatorIdentity';
import type { Session } from './session/types';

/** Demonstration only. The institutional API derives course scope from server-side assignments. */
export function demoCoordinatorCourses(
  actor: Pick<Session, 'email' | 'role'> | null,
): readonly string[] {
  return actor?.role === 'coordinator' && actor.email === coordinatorLoginEmail()
    ? demoCoordinator.courseIds
    : [];
}
