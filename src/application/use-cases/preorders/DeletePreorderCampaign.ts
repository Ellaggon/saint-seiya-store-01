import { ApplicationError } from "@/application/errors/ApplicationError";
import { DeleteProductUseCase } from "@/application/use-cases/admin/products/DeleteProductUseCase";
import type { ProductRepository } from "@/domain/repositories/ProductRepository";
import type { PreorderRepository } from "@/domain/repositories/PreorderRepository";

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export interface DeletePreorderCampaignInput {
  id: string;
  deleteProduct?: boolean;
}

export class DeletePreorderCampaign {
  constructor(
    private readonly preorderRepository: PreorderRepository,
    private readonly productRepository: ProductRepository,
    private readonly deleteProduct: DeleteProductUseCase,
  ) {}

  async execute(input: DeletePreorderCampaignInput): Promise<void> {
    if (!input.id || !isUuid(input.id)) {
      throw ApplicationError.validation("El ID de la preventa es inválido");
    }

    const campaign = await this.preorderRepository.findCampaignById(input.id);
    if (!campaign) {
      throw ApplicationError.validation(
        "La preventa no existe o ya fue eliminada.",
      );
    }

    if (input.deleteProduct) {
      const otherCampaigns = (
        await this.preorderRepository.findCampaignByProductId(campaign.productId)
      ).filter((item) => item.id !== campaign.id);

      if (otherCampaigns.length > 0) {
        throw ApplicationError.validation(
          "El producto tiene otras preventas. Elimina solo esta campaña, o borra las demás antes de quitarlo del catálogo.",
        );
      }

      const orderItemCount = await this.productRepository.countOrderItems(
        campaign.productId,
      );
      if (orderItemCount > 0) {
        throw ApplicationError.validation(
          "El producto ya aparece en pedidos. Puedes eliminar solo la preventa; el producto debe permanecer en el catálogo.",
        );
      }
    }

    await this.preorderRepository.deleteCampaign(campaign.id);

    if (!input.deleteProduct) return;

    try {
      await this.deleteProduct.execute(campaign.productId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el producto del catálogo.";
      throw ApplicationError.validation(
        `La preventa se eliminó, pero el producto no se pudo quitar del catálogo. ${message}`,
      );
    }
  }
}
