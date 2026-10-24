import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { Selection } from "./types";

const HOUR = 60 * 60 * 1000;

export const queryKeys = {
  meta: ["meta"] as const,
  day: (day: string, s: Selection) => ["day", day, s.mode, s.cutoff, s.horizon] as const,
  accuracy: (s: Selection) => ["accuracy", s.mode, s.cutoff, s.horizon] as const,
};

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta,
    queryFn: ({ signal }) => api.meta(signal),
    staleTime: HOUR,
  });
}

export function useDay(day: string | undefined, selection: Selection) {
  return useQuery({
    queryKey: queryKeys.day(day ?? "", selection),
    queryFn: ({ signal }) => api.day(day!, selection, signal),
    enabled: Boolean(day),
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  });
}

export function useAccuracy(selection: Selection) {
  return useQuery({
    queryKey: queryKeys.accuracy(selection),
    queryFn: ({ signal }) => api.accuracy(selection, signal),
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  });
}
