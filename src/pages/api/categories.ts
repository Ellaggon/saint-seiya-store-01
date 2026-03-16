import type { APIRoute } from "astro";
import { GET as getCategories } from "../../endpoints/api/categories";

export const GET: APIRoute = (context) => getCategories(context);
