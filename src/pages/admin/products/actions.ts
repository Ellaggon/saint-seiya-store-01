import type { APIRoute } from "astro";
import { prisma } from "@/infrastructure/database/prisma";
import { slugify } from "@/lib/utils";

// Helper to validate admin role (redundant because of middleware but safe)
const ensureAdmin = (locals: any) => {
  if (!locals.user || locals.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
};

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  try {
    ensureAdmin(locals);

    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "create") {
      const name = formData.get("name") as string;
      // const slug = (formData.get("slug") as string) || slugify(name);
      const description = formData.get("description") as string;
      const price = parseFloat(formData.get("price") as string);
      const height = parseFloat(formData.get("height") as string);
      const imageUrl = formData.get("imageUrl") as string;
      const categoryId = formData.get("categoryId") as string;
      const status = formData.get("status") as any;

      let baseSlug = (formData.get("slug") as string) || slugify(name);
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const existing = await prisma.product.findUnique({
          where: { slug },
        });

        if (!existing) break;

        counter++;
        slug = `${baseSlug}-${counter}`;
      }

      await prisma.product.create({
        data: {
          name,
          slug,
          description,
          price,
          height,
          imageUrl,
          categoryId,
          status,
        },
      });

      return redirect("/admin/products");
    }

    if (action === "update") {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;
      const slug = (formData.get("slug") as string) || slugify(name);
      const description = formData.get("description") as string;
      const price = parseFloat(formData.get("price") as string);
      const height = parseFloat(formData.get("height") as string);
      const imageUrl = formData.get("imageUrl") as string;
      const categoryId = formData.get("categoryId") as string;
      const status = formData.get("status") as any;

      await prisma.product.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          price,
          height,
          imageUrl,
          categoryId,
          status,
        },
      });

      return redirect("/admin/products");
    }

    if (action === "delete") {
      const id = formData.get("id") as string;

      await prisma.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return redirect("/admin/products");
    }

    return new Response("Action not found", { status: 400 });
  } catch (error: any) {
    console.error("Admin Action Error:", error);
    return new Response(error.message || "Internal Server Error", {
      status: 500,
    });
  }
};
