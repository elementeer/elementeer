export class CapabilityRegistry {
  static getInstance() {
    return new CapabilityRegistry();
  }

  getAll() {
    return ['*'];
  }

  resolve(tier: string): string[] {
    return ['*'];
  }
}
