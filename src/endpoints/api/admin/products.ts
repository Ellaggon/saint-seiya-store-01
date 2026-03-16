import type { APIRoute } from "astro";
import { CreateProductUseCase } from "../../../application/use-cases/CreateProductUseCase";
import { UpdateProductUseCase } from "../../../application/use-cases/UpdateProductUseCase";
import { PrismaProductRepository } from "../../../infrastructure/database/PrismaProductRepository";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const action = formData.get("_action") as string;

    const repository = new PrismaProductRepository();

    if (action === "create") {
      const useCase = new CreateProductUseCase(repository);
      const product = await useCase.execute({
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        price: parseFloat(formData.get("price") as string),
        categoryId: formData.get("categoryId") as string,
        collectionId: formData.get("collectionId") as string,
        height: parseFloat(formData.get("height") as string),
        material: formData.get("material") as string,
        imageUrl: formData.get("imageUrl") as string,
        stock: parseInt(formData.get("stock") as string) || 0,
        status: formData.get("status") as any,
      });

      return new Response(JSON.stringify(product), { status: 201 });
    }

    if (action === "update") {
      const useCase = new UpdateProductUseCase(repository);
      const product = await useCase.execute({
        id: formData.get("id") as string,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        price: parseFloat(formData.get("price") as string),
        categoryId: formData.get("categoryId") as string,
        collectionId: formData.get("collectionId") as string,
        height: parseFloat(formData.get("height") as string),
        material: formData.get("material") as string,
        imageUrl: formData.get("imageUrl") as string,
        stock: parseInt(formData.get("stock") as string) || 0,
        status: formData.get("status") as any,
      });

      return new Response(JSON.stringify(product), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Action not supported" }), {
      status: 400,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
