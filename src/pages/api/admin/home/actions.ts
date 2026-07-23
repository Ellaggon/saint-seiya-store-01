import type { APIRoute } from "astro";
import { parseHomeContentFromForm } from "@/application/dto/homeContent.dto";
import { saveHomeContent } from "@/application/services/HomeContentService";
import { prisma } from "@/infrastructure/database/prisma";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;
  if (!user || user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const formData = await request.formData();
  const content = parseHomeContentFromForm(formData);

  const missingCollection = content.featuredCollections.find(
    (card) => !card.collectionSlug,
  );
  if (missingCollection) {
    return redirect(
      `/admin/home?error=${encodeURIComponent("Cada figura destacada necesita una colección.")}`,
      303,
    );
  }

  const slugs = content.featuredCollections.map((card) => card.collectionSlug);
  const collections = await prisma.collection.findMany({
    where: {
      slug: { in: slugs },
      deletedAt: null,
    },
    select: { slug: true, name: true },
  });
  const bySlug = new Map(collections.map((item) => [item.slug, item.name]));
  const invalid = slugs.find((slug) => !bySlug.has(slug));
  if (invalid) {
    return redirect(
      `/admin/home?error=${encodeURIComponent(`La colección "${invalid}" no existe o está desactivada.`)}`,
      303,
    );
  }

  content.featuredCollections = content.featuredCollections.map((card) => ({
    ...card,
    collectionName: bySlug.get(card.collectionSlug) ?? card.collectionSlug,
  })) as typeof content.featuredCollections;

  try {
    await saveHomeContent(content, user.id);
    return redirect("/admin/home?saved=1", 303);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el inicio";
    return redirect(`/admin/home?error=${encodeURIComponent(message)}`, 303);
  }
};
