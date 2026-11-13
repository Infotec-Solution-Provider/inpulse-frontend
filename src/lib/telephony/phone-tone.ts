import type { AudioPreferences } from "./audio-preferences";
const toneContexts = new WeakMap<HTMLAudioElement, AudioContext>();
export async function resumePhoneTone(output: HTMLAudioElement) {
  await toneContexts.get(output)?.resume();
  await output.play();
}

/** Local tone only. The remote conversation always has its own audio element. */
export function startPhoneTone(output: HTMLAudioElement, preferences: AudioPreferences, ring: boolean, blocked: () => void): () => void {
  const context = new AudioContext(), destination = context.createMediaStreamDestination();
  toneContexts.set(output, context);
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.frequency.value = ring ? 440 : 425;
  gain.gain.value = 0.08;
  oscillator.connect(gain).connect(destination); oscillator.start();
  output.srcObject = destination.stream; output.volume = preferences.outputVolume;
  const sink = "setSinkId" in output ? output.setSinkId(ring ? preferences.ringOutputId : preferences.outputId) : Promise.resolve();
  void sink.then(() => context.resume()).then(() => output.play()).catch(blocked);
  let audible = true;
  const timer = setInterval(() => { audible = !audible; gain.gain.value = audible ? 0.08 : 0; }, ring ? 1000 : 800);
  return () => { clearInterval(timer); oscillator.stop(); output.pause(); output.srcObject = null; toneContexts.delete(output); void context.close(); };
}
