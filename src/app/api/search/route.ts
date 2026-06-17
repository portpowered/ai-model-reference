import { docsSearchApi } from "@/lib/search/search-server";

export const revalidate = false;

export const { GET } = docsSearchApi;
