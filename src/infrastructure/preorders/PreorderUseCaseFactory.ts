import {
  CancelReservation,
  CreatePreorderCampaign,
  DeletePreorderCampaign,
  ExpirePendingReservations,
  GetPreorderDetail,
  ListPreorderReservations,
  ListPreorders,
  MarkArrived,
  RegisterManualPreorderPayment,
  ReservePreorder,
  UpdatePreorderCampaign,
} from "@/application/use-cases/preorders";
import { DeleteProductUseCase } from "@/application/use-cases/admin/products/DeleteProductUseCase";
import { PrismaPreorderRepository } from "@/infrastructure/database/PrismaPreorderRepository";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";
import { R2Storage } from "@/infrastructure/storage/r2Storage";

const createPreorderRepository = () => new PrismaPreorderRepository();

export const createListPreordersUseCase = (): ListPreorders =>
  new ListPreorders(createPreorderRepository());

export const createGetPreorderDetailUseCase = (): GetPreorderDetail =>
  new GetPreorderDetail(createPreorderRepository());

export const createReservePreorderUseCase = (): ReservePreorder =>
  new ReservePreorder(createPreorderRepository());

export const createCreatePreorderCampaignUseCase = (): CreatePreorderCampaign =>
  new CreatePreorderCampaign(
    createPreorderRepository(),
    new PrismaProductRepository(),
  );

export const createUpdatePreorderCampaignUseCase = (): UpdatePreorderCampaign =>
  new UpdatePreorderCampaign(createPreorderRepository());

export const createMarkArrivedUseCase = (): MarkArrived =>
  new MarkArrived(createPreorderRepository());

export const createCancelReservationUseCase = (): CancelReservation =>
  new CancelReservation(createPreorderRepository());

export const createListPreorderReservationsUseCase =
  (): ListPreorderReservations =>
    new ListPreorderReservations(createPreorderRepository());

export const createRegisterManualPreorderPaymentUseCase =
  (): RegisterManualPreorderPayment =>
    new RegisterManualPreorderPayment(createPreorderRepository());

export const createExpirePendingReservationsUseCase =
  (): ExpirePendingReservations =>
    new ExpirePendingReservations(createPreorderRepository());

export const createDeletePreorderCampaignUseCase = (): DeletePreorderCampaign => {
  const productRepository = new PrismaProductRepository();
  return new DeletePreorderCampaign(
    createPreorderRepository(),
    productRepository,
    new DeleteProductUseCase(productRepository, new R2Storage()),
  );
};
