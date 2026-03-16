import type { APIRoute } from "astro";
import { ListCollectionsUseCase } from "../../application/use-cases/ListCollectionsUseCase";
import { PrismaCollectionRepository } from "../../infrastructure/database/PrismaCollectionRepository";

export const GET: APIRoute = async () => {
  try {
    const repository = new PrismaCollectionRepository();
    const useCase = new ListCollectionsUseCase(repository);

    const collections = await useCase.execute();

    return new Response(JSON.stringify(collections), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
