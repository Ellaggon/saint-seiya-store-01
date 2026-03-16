import type { APIRoute } from "astro";
import { prisma } from "../../infrastructure/database/prisma";

// Quick endpoint for categories (Sagas)
export const GET: APIRoute = async () => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return new Response(JSON.stringify(categories), {
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
