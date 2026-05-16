import type { ProductDTO } from "@/application/dto/catalog.dto";
import type {
  PaginatedResultDTO,
  PreorderDetailDTO,
  PreorderListItemDTO,
  PreorderReservationDTO,
} from "@/application/dto/preorder.dto";

interface ApiSuccess<T> {
  data: T;
}

interface ApiError {
  error: {
    message: string;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isApiSuccess = <T>(value: unknown): value is ApiSuccess<T> =>
  isRecord(value) && "data" in value;

const isApiError = (value: unknown): value is ApiError =>
  isRecord(value) &&
  isRecord(value.error) &&
  typeof value.error.message === "string";

const readJson = async <T>(response: Response): Promise<T> => {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = isApiError(body)
      ? body.error.message
      : "Admin preorder request failed";
    throw new Error(message);
  }

  return isApiSuccess<T>(body) ? body.data : (body as T);
};

export const adminGet = async <T>(
  origin: string,
  cookie: string | null,
  path: string,
): Promise<T> => {
  const response = await fetch(new URL(path, origin), {
    headers: { cookie: cookie ?? "" },
  });
  return readJson<T>(response);
};

export const listAdminPreorders = (
  origin: string,
  cookie: string | null,
  query = "",
): Promise<PaginatedResultDTO<PreorderListItemDTO>> =>
  adminGet(origin, cookie, `/api/admin/preorders${query}`);

export const getAdminPreorder = (
  origin: string,
  cookie: string | null,
  id: string,
): Promise<PreorderDetailDTO> =>
  adminGet(origin, cookie, `/api/admin/preorders/${id}`);

export const listAdminPreorderReservations = (
  origin: string,
  cookie: string | null,
  id: string,
): Promise<PreorderReservationDTO[]> =>
  adminGet(origin, cookie, `/api/admin/preorders/${id}/reservations`);

export const listProductsForPreorderAdmin = (
  origin: string,
): Promise<ProductDTO[]> => adminGet(origin, null, "/api/products");
