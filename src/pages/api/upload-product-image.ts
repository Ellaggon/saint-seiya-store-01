import type { APIRoute } from "astro";
import { POST as uploadHandler } from "../../endpoints/api/upload-product-image";

export const POST: APIRoute = (context) => uploadHandler(context);
