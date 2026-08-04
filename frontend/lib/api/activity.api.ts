import apiClient from "./client";
import { WorkingOutCount } from "@/types/activity.types";

export const getWorkingOutCount = async (): Promise<WorkingOutCount> => {
  const { data } = await apiClient.get("/api/activity/working-out-count");
  return data.result.activity;
};
