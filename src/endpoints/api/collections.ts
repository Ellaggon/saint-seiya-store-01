import type { APIRoute } from "astro";
import { ListCollectionsUseCase } from "../../application/use-cases/ListCollectionsUseCase";
import { PrismaCollectionRepository } from "../../infrastructure/database/PrismaCollectionRepository";
import { legacyFailure, legacySuccess } from "@/endpoints/api/shared/api-response";

export const GET: APIRoute = async () => {
  try {
    const repository = new PrismaCollectionRepository();
    const useCase = new ListCollectionsUseCase(repository);

    const collections = await useCase.execute();

    return legacySuccess(collections);
  } catch (error: unknown) {
    return legacyFailure(error);
  }
};
