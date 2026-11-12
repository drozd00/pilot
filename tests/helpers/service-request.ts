import type { ServiceRequest } from '../../app/lib/service-request.ts'

/**
 * Baseline answers that pass every validation rule.
 *
 * Tests copy this object and change individual fields to isolate a single failure.
 */
export function createValidValues(): ServiceRequest {
  return {
    fullName: 'Jan Urban',
    phone: '+420 777 601 248',
    email: 'jan.urban@example.test',
    street: 'Nad Smetankou',
    houseNumber: '2317/12',
    zipCode: '130 00',
    city: 'Praha 3',
    objectType: 'byt',
    issueCategory: 'voda',
    priority: 'standard',
    preferredDate: '2026-04-15',
    timeWindow: '10-12',
  }
}
