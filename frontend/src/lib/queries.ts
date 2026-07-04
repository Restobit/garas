import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "./api";
import type { BaseDoc } from "./types";

function listPath(entity: string, filters?: Record<string, string | number | boolean>): string {
  if (!filters) return `/${entity}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/${entity}?${qs}` : `/${entity}`;
}

export function useList<T extends BaseDoc>(
  entity: string,
  filters?: Record<string, string | number | boolean>,
  options?: Partial<UseQueryOptions<T[]>>,
) {
  return useQuery<T[]>({
    queryKey: [entity, filters ?? {}],
    queryFn: () => api.get<T[]>(listPath(entity, filters)),
    ...options,
  });
}

export function useCreate<T extends BaseDoc>(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<T>) => api.post<T>(`/${entity}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entity] }),
  });
}

export function useUpdate<T extends BaseDoc>(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ _id, ...data }: Partial<T> & { _id: string }) => api.put<T>(`/${entity}/${_id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entity] }),
  });
}

export function useDelete(entity: string, extraInvalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/${entity}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
      for (const key of extraInvalidate) qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

/** Drag-and-drop sorrend azonnali mentése: a lista új sorrendjét kapja meg. */
export function useReorder<T extends BaseDoc>(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: T[]) =>
      api.post<T[]>(
        `/${entity}/reorder`,
        { ids: rows.map((r) => r._id) },
      ),
    onMutate: (rows) => {
      // Optimista frissítés, hogy a sor ne ugorjon vissza a válaszig
      qc.setQueryData([entity, {}], rows);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [entity] }),
  });
}

export function useUsageCheck() {
  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: string; id: string }) =>
      api.get<{ usages: string[] }>(`/usage/${entityType}/${id}`),
  });
}

export function useUnprocessedCount() {
  return useQuery({
    queryKey: ["receipts", "unprocessed-count"],
    queryFn: () => api.get<{ count: number }>("/receipts/unprocessed-count"),
    refetchInterval: 30_000,
  });
}
