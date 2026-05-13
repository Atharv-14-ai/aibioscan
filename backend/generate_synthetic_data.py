# generate_synthetic_data.py
import os, numpy as np, soundfile as sf, random

def burst_noise(sr, dur, n_bursts=3):
    y = np.zeros(int(sr*dur), dtype=np.float32)
    for _ in range(n_bursts):
        start = random.randint(0, len(y)-int(0.2*sr)-1)
        length = random.randint(int(0.05*sr), int(0.2*sr))
        y[start:start+length] += 0.5*np.random.randn(length).astype(np.float32)
    return y / (np.max(np.abs(y)) + 1e-6)

def wheeze_like(sr, dur):
    t = np.linspace(0, dur, int(sr*dur), endpoint=False)
    f = 400 + 200*np.sin(2*np.pi*2*t)
    y = 0.2*np.sin(2*np.pi*f*t).astype(np.float32)
    return y * np.exp(-3*t)

def healthy_voice(sr, dur):
    t = np.linspace(0, dur, int(sr*dur), endpoint=False)
    return (0.1*np.sin(2*np.pi*180*t) + 0.1*np.sin(2*np.pi*220*t)).astype(np.float32)

def tb_like(sr, dur):
    # Simulated "Tuberculosis cough" = noisy + wheezy mix
    return (burst_noise(sr, dur, n_bursts=6) + 0.3*wheeze_like(sr, dur)) / 2

def gen_class(out_dir, fn, generator, sr=16000, dur=3.0):
    os.makedirs(out_dir, exist_ok=True)
    for i in range(fn):
        y = generator(sr, dur)
        sf.write(os.path.join(out_dir, f"sample_{i+1:02d}.wav"), y, sr)

if __name__ == "__main__":
    gen_class("data/Asthma", 10, wheeze_like)
    gen_class("data/Pneumonia", 3, burst_noise)
    gen_class("data/Healthy", 150, healthy_voice)
    gen_class("data/Tuberculosis", 50, tb_like)  # ✅ new class
    print("✅ Synthetic samples written to data/")
