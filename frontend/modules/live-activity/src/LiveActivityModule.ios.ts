import { NativeModule, requireNativeModule } from "expo";
import { LiveActivityContentStateInput } from "./LiveActivity.types";

declare class LiveActivityModule extends NativeModule<{}> {
  isSupported(): boolean;
  startActivity(activityType: string, startedAtMs: number): Promise<void>;
  updateActivity(state: LiveActivityContentStateInput): Promise<void>;
  endActivity(): Promise<void>;
}

export default requireNativeModule<LiveActivityModule>("LiveActivity");
