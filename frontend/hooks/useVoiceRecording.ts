import { useRef } from "react";
import { Alert } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";

// HIGH_QUALITY outputs .m4a (AAC) on both iOS and Android — sent as-is to
// the backend's /api/chat/transcribe, which hands it straight to Whisper
// (accepts m4a natively, no transcoding needed anywhere in this path).
export const useVoiceRecording = () => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  // Guards against a double-tap firing startRecording twice before the
  // first call's prepareToRecordAsync has resolved and isRecording has
  // had a chance to flip true.
  const isStartingRef = useRef(false);

  const startRecording = async (): Promise<boolean> => {
    if (isStartingRef.current || recorderState.isRecording) return false;
    isStartingRef.current = true;

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow microphone access to speak a message to your AI coach.",
        );
        return false;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      return true;
    } finally {
      isStartingRef.current = false;
    }
  };

  // Returns null if nothing was actually recorded (e.g. stop is called
  // without a prior successful start) — callers should treat that as "no
  // recording to transcribe," not as an error.
  const stopRecording = async (): Promise<string | null> => {
    if (!recorderState.isRecording) return null;
    await audioRecorder.stop();
    return audioRecorder.uri;
  };

  return {
    isRecording: recorderState.isRecording,
    startRecording,
    stopRecording,
  };
};
