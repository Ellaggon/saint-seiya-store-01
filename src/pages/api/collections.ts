import type { APIRoute } from "astro";
import { GET as getCollections } from "../../endpoints/api/collections";

export const GET: APIRoute = (context) => getCollections(context);
