"""Musique originale de la pub Pingo (synthétisée, libre de droits) : 120 BPM, 15 s, + bruitages calés sur l'animation."""
import numpy as np, wave, sys

SR, DUR, BPM = 44100, 15.0, 120
N = int(SR * DUR)
beat = 60 / BPM
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); j = min(N, i + len(sig))
    if i >= N: return
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))

def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.9

def clap():
    n = int(0.22 * SR); s = rng.standard_normal(n)
    s = np.convolve(s, np.ones(6) / 6, 'same') - np.convolve(s, np.ones(40) / 40, 'same')
    return s * env(n, 0.001, 0.06) * 0.55

def hat():
    n = int(0.06 * SR); s = rng.standard_normal(n); s = s - np.convolve(s, np.ones(4) / 4, 'same')
    return s * env(n, 0.001, 0.015) * 0.22

def tone(freq, dur, shape='pluck', gain=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    if shape == 'pluck':
        s = (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)) * env(n, 0.004, 0.16)
    elif shape == 'bass':
        s = np.tanh(2.2 * np.sin(2 * np.pi * freq * t)) * env(n, 0.01, 0.35)
    else:  # pad
        s = sum(np.sin(2 * np.pi * freq * (1 + d) * t) for d in (-0.004, 0, 0.004)) / 3 * np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15)
    return s * gain

def nfreq(m): return 440 * 2 ** ((m - 69) / 12)

# grille d'accords : C – G – Am – F (une mesure = 4 temps = 2 s)
chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
bassn = [36, 31, 33, 29]
end_music = 14.6

t = 0.0; bar = 0
while t < end_music:
    ch = chords[bar % 4]
    intro = t < 1.0
    for b in range(4):
        tb = t + b * beat
        if tb >= end_music: break
        if not intro or b == 2:
            add(kick(), tb, 0.9 if not intro else 0.5)
        if b in (1, 3) and not intro: add(clap(), tb, 0.8)
        for h in range(2):
            if not intro: add(hat(), tb + h * beat / 2, 1.0, pan=0.3)
        add(tone(nfreq(bassn[bar % 4]), beat * 0.9, 'bass', 0.32), tb)
        # arpège en doubles croches
        for s16 in range(4):
            m = ch[(b * 4 + s16) % 3] + 12 + (12 if (s16 == 3 and b % 2) else 0)
            add(tone(nfreq(m), 0.25, 'pluck', 0.12 if not intro else 0.07), tb + s16 * beat / 4, pan=-0.25 if s16 % 2 else 0.25)
    for m in ch: add(tone(nfreq(m), 4 * beat, 'pad', 0.05), t)
    t += 4 * beat; bar += 1

# accord final
for m in [60, 64, 67, 72]: add(tone(nfreq(m), 1.2, 'pluck', 0.16), 14.0)
add(kick(), 14.0, 1.0)

# ---- bruitages ----
def pop(f0=500, f1=1200, d=0.09, g=0.35):
    n = int(d * SR); tt = np.arange(n) / SR
    f = f0 + (f1 - f0) * (tt / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, d / 3) * g

def whoosh(d=0.35, g=0.45, up=True):
    n = int(d * SR); s = rng.standard_normal(n); tt = np.arange(n) / n
    k = np.clip((40 if up else 4) + (tt if up else 1 - tt) * 36, 2, 80).astype(int)
    out = np.array([s[max(0, i - k[i]):i + 1].mean() for i in range(n)])
    return out * np.sin(np.pi * tt) ** 1.5 * g * 3

def ding():
    a = tone(nfreq(88), 0.6, 'pluck', 0.22); b = np.pad(tone(nfreq(93), 0.5, 'pluck', 0.18), (int(0.09 * SR), 0))
    b = np.pad(b, (0, max(0, len(a) - len(b))))[: len(a)]
    return a + b

def boing():
    n = int(0.4 * SR); tt = np.arange(n) / SR
    f = 180 + 260 * np.exp(-tt * 9) * (1 + 0.25 * np.sin(tt * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.15) * 0.45

add(whoosh(0.5, 0.35, up=False), 0.05)
add(boing(), 0.55)
for tt_, f in [(1.15, 600), (1.42, 760), (1.68, 950)]: add(pop(f * 0.6, f * 1.5), tt_)
add(pop(400, 900, 0.12, 0.3), 2.1)
for tt_ in (2.6, 3.2, 3.8): add(whoosh(0.32, 0.5), tt_ - 0.05)
add(whoosh(0.3, 0.4, up=False), 4.4)
add(pop(300, 1400, 0.16, 0.4), 4.6)
add(whoosh(0.55, 0.45), 5.0)
for tt_ in (5.3, 6.3, 7.4): add(pop(700, 1300, 0.08, 0.28), tt_)
for tt_ in (6.15, 7.3): add(whoosh(0.28, 0.35), tt_)
# montée avant le flash
n = int(0.6 * SR); tt = np.arange(n) / SR
add(np.sin(2 * np.pi * np.cumsum(300 + 900 * (tt / 0.6) ** 2) / SR) * (tt / 0.6) * 0.18, 7.8)
add(kick(), 8.4, 1.1); add(whoosh(0.4, 0.5, up=False), 8.4)
for i in range(12): add(pop(900 + i * 60, 1300 + i * 60, 0.05, 0.12), 8.5 + i * 0.05)
add(whoosh(0.45, 0.45), 9.65)
for i in range(16): add(pop(1400, 2000, 0.03, 0.08), 10.3 + i * 0.05)
add(ding(), 11.65); add(ding(), 11.95)
add(pop(250, 1000, 0.2, 0.45), 12.85)
add(boing(), 13.3)

# mixage
mix = np.stack([L, R], 1)
fade = np.ones(N); fs_ = int(14.6 * SR); fade[fs_:] = np.linspace(1, 0, N - fs_)
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) / 0.89
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1])
