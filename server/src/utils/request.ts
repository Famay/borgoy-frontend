import { HttpError } from "./httpError";

export function getRouteParam(
  value: string | string[] | undefined,
  name: string
) {
  if (!value || Array.isArray(value)) {
    throw new HttpError(400, `Некорректный параметр маршрута: ${name}`);
  }

  return value;
}
