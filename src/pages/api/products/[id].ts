import type { APIRoute } from "astro";
import { getProductById } from "@/endpoints/api/products/getProductById";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(null, { status: 400 });
  }

  const result = await getProductById(id);

  if (!result) {
    return new Response(null, { status: 404 });
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};
