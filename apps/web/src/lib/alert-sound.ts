// Short WebAudio tone. Browsers keep an AudioContext suspended until a user gesture, so one
// shared context is created and resumed by unlockAlertAudio() on the first click/tap/key press.
let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  sharedCtx = new AudioCtx();
  return sharedCtx;
}

export function unlockAlertAudio(): void {
  try {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  } catch {
    // Audio unavailable
  }
}

export function playAlertTone(emergency: boolean): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = emergency ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(emergency ? 880 : 587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Autoplay blocked or audio unavailable
  }
}

export function vibrateAlert(): void {
  try {
    navigator.vibrate?.([400, 150, 400, 150, 400]);
  } catch {
    // Vibration API unsupported
  }
}
