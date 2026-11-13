import { afterEach, describe, expect, it, vi } from "vitest";
import { applyCodecPreferences, audioConstraints, defaultAudioPreferences, readAudioPreferences } from "./audio-preferences";
afterEach(() => vi.unstubAllGlobals());
describe("local phone audio preferences", () => {
  it("defaults processing on and automatic answering off", () => {
    expect(defaultAudioPreferences).toMatchObject({ autoAnswer: false, echoCancellation: true, noiseSuppression: true, autoGainControl: true });
  });
  it("sends only supported processing constraints and preserves an explicitly selected microphone", () => {
    expect(audioConstraints({ ...defaultAudioPreferences, microphoneId: "headset-1", noiseSuppression: false }, { noiseSuppression: true })).toEqual({ deviceId: { exact: "headset-1" }, noiseSuppression: false });
  });
  it("isolates local settings by tenant/operator and rejects corrupt or invalid data", () => {
    const getItem = vi.fn((key: string) => key.endsWith(":a:7") ? JSON.stringify({ autoAnswer: true, outputVolume: 5, microphoneId: 77, codecOrder: [false] }) : "bad-json");
    vi.stubGlobal("localStorage", { getItem });
    expect(readAudioPreferences("a:7")).toEqual({ ...defaultAudioPreferences, autoAnswer: true });
    expect(readAudioPreferences("b:7")).toEqual(defaultAudioPreferences);
  });
  it("reorders supported codecs while retaining auxiliary capabilities", () => {
    const codecs = [{ mimeType: "audio/opus" }, { mimeType: "audio/red" }, { mimeType: "audio/PCMU" }];
    vi.stubGlobal("RTCRtpReceiver", { getCapabilities: () => ({ codecs }) });
    const setCodecPreferences = vi.fn();
    applyCodecPreferences({ getTransceivers: () => [{ sender: { track: { kind: "audio" } }, setCodecPreferences }] } as unknown as RTCPeerConnection, ["audio/PCMU"]);
    expect(setCodecPreferences).toHaveBeenCalledWith([codecs[2], codecs[0], codecs[1]]);
  });
});
