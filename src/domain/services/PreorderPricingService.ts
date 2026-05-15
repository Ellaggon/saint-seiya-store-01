import {
  PreorderCampaign,
  PreorderDepositType,
} from "../entities/PreorderCampaign";
import { Money } from "../value-objects/Money";

export interface PreorderPricingInput {
  unitPrice: Money;
  quantity: number;
  campaign: PreorderCampaign;
  payInFull: boolean;
}

export interface PreorderPricingResult {
  unitPrice: Money;
  quantity: number;
  totalAmount: Money;
  depositRequired: Money;
  amountDueNow: Money;
  balanceDue: Money;
}

export class PreorderPricingService {
  calculate(input: PreorderPricingInput): PreorderPricingResult {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new Error("Preorder quantity must be a positive integer");
    }

    if (input.payInFull && !input.campaign.allowFullPayment) {
      throw new Error("Full payment is not allowed for this preorder campaign");
    }

    const totalAmount = input.unitPrice.multiply(input.quantity);
    const depositRequired = this.calculateDeposit(input.campaign, totalAmount);
    const amountDueNow = input.payInFull ? totalAmount : depositRequired;
    const balanceDue = totalAmount.subtract(amountDueNow);

    return {
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      totalAmount,
      depositRequired,
      amountDueNow,
      balanceDue,
    };
  }

  private calculateDeposit(
    campaign: PreorderCampaign,
    totalAmount: Money,
  ): Money {
    if (campaign.depositType === PreorderDepositType.FULL) {
      return totalAmount;
    }

    if (campaign.depositType === PreorderDepositType.FIXED) {
      const fixedDeposit = Money.from(campaign.depositValue);

      if (fixedDeposit.greaterThan(totalAmount)) {
        throw new Error("Fixed deposit cannot exceed preorder total");
      }

      return fixedDeposit;
    }

    if (campaign.depositValue > 100) {
      throw new Error("Percent deposit cannot exceed 100");
    }

    return totalAmount.multiply(campaign.depositValue / 100);
  }
}
