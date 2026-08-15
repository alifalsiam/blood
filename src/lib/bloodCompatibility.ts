export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

/**
 * Checks if a donor blood group is compatible for a recipient (receiver) blood group.
 */
export function isBloodCompatible(donorGroup: string, receiverGroup: string): boolean {
  if (!donorGroup || !receiverGroup) return true;

  const d = donorGroup.trim().toUpperCase();
  const r = receiverGroup.trim().toUpperCase();

  // Universal donor
  if (d === 'O-') return true;

  // Universal recipient
  if (r === 'AB+') return true;

  const compatibilityMap: Record<string, string[]> = {
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'A-': ['O-', 'A-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'B-': ['O-', 'B-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'O+': ['O-', 'O+'],
    'O-': ['O-'],
  };

  const allowedDonors = compatibilityMap[r] || [r];
  return allowedDonors.includes(d);
}

/**
 * Returns list of compatible donor blood groups for a given receiver blood group.
 */
export function getCompatibleDonorGroups(receiverGroup: string): string[] {
  const r = receiverGroup.trim().toUpperCase();
  const compatibilityMap: Record<string, string[]> = {
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'A-': ['O-', 'A-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'B-': ['O-', 'B-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'O+': ['O-', 'O+'],
    'O-': ['O-'],
  };

  return compatibilityMap[r] || ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
}

/**
 * Returns true if the countdown hours indicates an emergency (<= 4 hours).
 */
export function isEmergencyRequest(hours: number): boolean {
  return hours <= 4;
}
