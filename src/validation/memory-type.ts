/**
 * Memory content type classification
 * Week 6 Day 39-41: Memory poisoning protection
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Classifies memory content as: fact, preference, or instruction
 * Instructions require approval to prevent memory poisoning
 */

/**
 * Memory content types
 */
export type MemoryContentType = 'fact' | 'preference' | 'instruction';

/**
 * Classify memory content type
 * 
 * Fact: Objective information (e.g., "We use TypeScript")
 * Preference: Subjective choice (e.g., "We prefer TypeScript")
 * Instruction: Command or directive (e.g., "Always use TypeScript")
 */
export function classifyMemoryType(content: string): MemoryContentType {
  const normalized = content.toLowerCase().trim();
  
  // Instruction indicators (require approval)
  const instructionPatterns = [
    /^(always|never|must|should|shall|will)\s+/i,
    /^(do|don't|do not)\s+/i,
    /^(use|avoid|prefer|require)\s+/i,
    /^(follow|implement|apply)\s+/i,
    /^(ensure|make sure|guarantee)\s+/i,
    /^(enforce|mandate|require)\s+/i,
    /when\s+(you|we|they)\s+(do|use|implement)/i,
    /if\s+(you|we|they)\s+(do|use|implement)/i,
  ];
  
  // Check for instruction patterns
  for (const pattern of instructionPatterns) {
    if (pattern.test(normalized)) {
      return 'instruction';
    }
  }
  
  // Preference indicators
  const preferencePatterns = [
    /^(we|i|they)\s+(prefer|like|dislike|favor)/i,
    /^(we|i|they)\s+(think|believe|feel|consider)/i,
    /^(our|my|their)\s+(preference|choice|decision)/i,
    /^(better|worse|best|worst)\s+(to|for|than)/i,
  ];
  
  // Check for preference patterns
  for (const pattern of preferencePatterns) {
    if (pattern.test(normalized)) {
      return 'preference';
    }
  }
  
  // Default: fact (objective information)
  return 'fact';
}

/**
 * Check if content requires approval
 * Instructions require approval to prevent memory poisoning
 */
export function requiresApproval(content: string): boolean {
  return classifyMemoryType(content) === 'instruction';
}

/**
 * Get human-readable description of memory type
 */
export function getMemoryTypeDescription(type: MemoryContentType): string {
  switch (type) {
    case 'fact':
      return 'Objective information (no approval needed)';
    case 'preference':
      return 'Subjective choice (review recommended)';
    case 'instruction':
      return 'Command or directive (approval required)';
  }
}

