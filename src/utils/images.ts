
import { BASE_URL } from "../services/api";

export const getFullImageUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const rootUrl = BASE_URL.replace(/\/api$/, "");
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${rootUrl}/storage/${cleanPath}`;
};
