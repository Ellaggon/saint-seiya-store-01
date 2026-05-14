export class Money {
  private readonly amount: number;

  private constructor(amount: number) {
    this.amount = Money.normalize(amount);
  }

  static from(value: number): Money {
    return new Money(value);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    const result = this.amount - other.amount;

    if (Money.normalize(result) < 0) {
      throw new Error("Money subtraction cannot produce a negative amount");
    }

    return new Money(result);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new Error("Money multiplier must be a finite non-negative number");
    }

    return new Money(this.amount * factor);
  }

  greaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }

  toNumber(): number {
    return this.amount;
  }

  private static normalize(value: number): number {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new Error("Money amount must be a finite number");
    }

    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;

    if (rounded < 0) {
      throw new Error("Money amount cannot be negative");
    }

    return rounded;
  }
}
