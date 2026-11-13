export interface AudioPreferences {
  microphoneId: string; outputId: string; ringOutputId: string;
  echoCancellation: boolean; noiseSuppression: boolean; autoGainControl: boolean;
  autoAnswer: boolean; ringEnabled: boolean; dialToneEnabled: boolean;
  outputVolume: number; codecOrder: string[];
}
export const defaultAudioPreferences: AudioPreferences = {
  microphoneId: "", outputId: "", ringOutputId: "", echoCancellation: true,
  noiseSuppression: true, autoGainControl: true, autoAnswer: false,
  ringEnabled: true, dialToneEnabled: true, outputVolume: 1, codecOrder: [],
};
export function readAudioPreferences(identity: string): AudioPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(`inpulse:phone-audio:${identity}`) || "{}");
    const result = { ...defaultAudioPreferences };
    for (const key of ["microphoneId", "outputId", "ringOutputId"] as const) if (typeof value[key] === "string") result[key] = value[key];
    for (const key of ["echoCancellation", "noiseSuppression", "autoGainControl", "autoAnswer", "ringEnabled", "dialToneEnabled"] as const) if (typeof value[key] === "boolean") result[key] = value[key];
    if (typeof value.outputVolume === "number" && value.outputVolume >= 0 && value.outputVolume <= 1) result.outputVolume = value.outputVolume;
    if (Array.isArray(value.codecOrder) && value.codecOrder.every((item: unknown) => typeof item === "string")) result.codecOrder = value.codecOrder;
    return result;
  } catch { return { ...defaultAudioPreferences }; }
}
export function audioConstraints(preferences: AudioPreferences, supported: MediaTrackSupportedConstraints): MediaTrackConstraints {
  const result: MediaTrackConstraints = {};
  if (preferences.microphoneId) result.deviceId = { exact: preferences.microphoneId };
  for (const key of ["echoCancellation", "noiseSuppression", "autoGainControl"] as const) if (supported[key]) result[key] = preferences[key];
  return result;
}
export function applyCodecPreferences(connection: RTCPeerConnection, order: string[]) {
  if (!order.length || typeof RTCRtpReceiver === "undefined") return;
  const codecs = RTCRtpReceiver.getCapabilities?.("audio")?.codecs;
  if (!codecs) return;
  const ranked = codecs.map((codec, index) => ({ codec, index, rank: order.indexOf(codec.mimeType) })).sort((a,b) => (a.rank < 0 ? order.length : a.rank) - (b.rank < 0 ? order.length : b.rank) || a.index - b.index).map(item => item.codec);
  for (const transceiver of connection.getTransceivers()) if (transceiver.sender.track?.kind === "audio" || transceiver.receiver.track?.kind === "audio") transceiver.setCodecPreferences?.(ranked);
}
