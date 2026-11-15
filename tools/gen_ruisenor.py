"""Genera un canto de ruiseñor sintetizado (silbidos, trinos y notas graves) -> menu-app/assets/ruisenor.mp3
Uso: python3 tools/gen_ruisenor.py   (requiere numpy y ffmpeg)"""
import numpy as np, subprocess, wave, os, sys
SR = 32000
rng = np.random.default_rng(7)
out = np.zeros(int(SR * 7.2))

def env(n, a=.12, r=.35):
    t = np.linspace(0, 1, n)
    e = np.minimum(1, t / max(a, 1e-3)) * np.minimum(1, (1 - t) / max(r, 1e-3))
    return np.clip(e, 0, 1) ** 1.3

def note(start, dur, f0, f1, amp=1.0, vib=0.0, vib_hz=38, harm=(1, .35, .12), curve=1.0, a=.12, r=.35, noise=0.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.linspace(0, 1, n) ** curve
    f = f0 + (f1 - f0) * x
    f = f * (1 + vib * np.sin(2 * np.pi * vib_hz * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(h * np.sin((k + 1) * ph) for k, h in enumerate(harm))
    if noise: s += noise * rng.standard_normal(n) * np.sin(ph) ** 2
    s *= env(n, a, r) * amp
    i = int(start * SR); out[i:i + n] += s[:max(0, len(out) - i)] if i + n > len(out) else s

t = 0.15
# 1) Silbidos lentos que crecen: "piu piu piu piu" (marca del ruiseñor)
for k in range(5):
    note(t, .42, 1900 + 140 * k, 3000 + 160 * k, amp=.35 + .13 * k, vib=.012, curve=.8, a=.25, r=.3); t += .5 + .02 * k
t += .12
# 2) Trino rápido alternando agudos
for k in range(18):
    up = k % 2 == 0
    note(t, .055, 2600 if up else 3600, 3600 if up else 2600, amp=.55, a=.2, r=.4); t += .052
t += .1
# 3) Notas graves y roncas "chok chok chok"
for k in range(3):
    note(t, .11, 1500, 800, amp=.5, harm=(1, .8, .6, .4), noise=.15, a=.05, r=.5); t += .19
t += .12
# 4) Gorgoteo líquido (barridos rápidos con vibrato)
for k in range(9):
    note(t, .09, 2200 + 120 * (k % 3), 3400 - 150 * (k % 4), amp=.5, vib=.05, vib_hz=55, a=.15, r=.45); t += .085
t += .1
# 5) Silbido largo con descenso y un trino corto final
note(t, .75, 3900, 2100, amp=.85, vib=.01, curve=1.6, a=.1, r=.4); t += .8
for k in range(7):
    note(t, .05, 3000 if k % 2 == 0 else 3800, 3800 if k % 2 == 0 else 3000, amp=.45, a=.2, r=.5); t += .05
# eco/reverberación suave
r = out.copy()
for d, g in ((.045, .32), (.087, .2), (.141, .12)):
    k = int(d * SR); r[k:] += g * out[:-k]
r = r[:int((t + .5) * SR)]
fade = int(.06 * SR); r[:fade] *= np.linspace(0, 1, fade); r[-int(.3 * SR):] *= np.linspace(1, 0, int(.3 * SR))
r = r / np.abs(r).max() * 0.85
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'menu-app', 'assets')
wav = os.path.join(dst, 'ruisenor.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((r * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', os.path.join(dst, 'ruisenor.mp3')], check=True)
os.remove(wav)
print('ok', round(len(r) / SR, 2), 's')
