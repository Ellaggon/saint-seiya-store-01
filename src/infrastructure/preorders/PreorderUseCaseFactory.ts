import {
  CreatePreorderCampaign,
  GetPreorderDetail,
  ListPreorders,
  MarkArrived,
  ReservePreorder,
  UpdatePreorderCampaign,
} from "@/application/use-cases/preorders";
import { PrismaPreorderRepository } from "@/infrastructure/database/PrismaPreorderRepository";
import { PrismaProductRepository } from "@/infrastructure/database/PrismaProductRepository";

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
