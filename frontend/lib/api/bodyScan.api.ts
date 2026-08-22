import apiClient from "./client";
import { BodyScan, SubmitBodyScanInput } from "@/types/bodyScan.types";

export const submitBodyScan = async (
  input: SubmitBodyScanInput,
): Promise<BodyScan> => {
  const formData = new FormData();
  formData.append("photo", {
    uri: input.photoUri,
    name: "scan.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  if (input.heightCm !== undefined) {
    formData.append("heightCm", String(input.heightCm));
  }
  if (input.weightKg !== undefined) {
    formData.append("weightKg", String(input.weightKg));
  }
  if (input.age !== undefined) {
    formData.append("age", String(input.age));
  }
  if (input.gender !== undefined) {
    formData.append("gender", input.gender);
  }

  const { data } = await apiClient.post("/api/body-scans", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // Upload plus a ~2.7s-average (but not capped) WorkoutX call — same
    // reasoning as blog.api.ts's createBlogPost.
    timeout: 60000,
  });
  return data.result.scan;
};

export const getBodyScanHistory = async (): Promise<BodyScan[]> => {
  const { data } = await apiClient.get("/api/body-scans");
  return data.result.scans;
};
