import type { Assessment } from './types';

/** First check that stops the allocation: a failure first, then missing configuration/data. */
export function mainReason(value: Assessment): string | null {
  const blocking =
    value.checks.find((c) => c.state === 'FAIL') ??
    value.checks.find((c) => c.state === 'CONFIGURATION_PENDING') ??
    value.checks.find((c) => c.state === 'PENDING');
  if (!blocking) return null;
  return `${blocking.state === 'FAIL' ? 'Impede' : 'Falta resolver'}: ${blocking.reason}`;
}
