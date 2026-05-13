import os
import numpy as np
import random
from .audio_utils import load_audio, compute_melspec, compute_mfcc_stack, augment

def target_frames(sr, duration_sec, hop_length, n_fft):
    """Compute number of frames for a given duration and hop length."""
    N = int(sr * duration_sec)
    T = 1 + max(0, (N - n_fft) // hop_length)
    return T

def pad_or_trim(F, T):
    """Pad or trim the feature matrix to match target frames."""
    t = F.shape[1]
    if t < T:
        pad = np.zeros((F.shape[0], T - t), dtype=F.dtype)
        return np.concatenate([F, pad], axis=1)
    return F[:, :T]

def discover(data_dir, class_order):
    """Discover all audio files under dataset directory structure."""
    files, labels = [], []
    for idx, cname in enumerate(class_order):
        cdir = os.path.join(data_dir, cname)
        if not os.path.isdir(cdir):
            continue
        for f in sorted(os.listdir(cdir)):
            if f.lower().endswith((".wav", ".flac", ".mp3", ".ogg")):
                files.append(os.path.join(cdir, f))
                labels.append(idx)
    return files, np.array(labels, dtype=np.int32)

def build_numpy(data_dir, cfg, balance=True, aug_multiplier=1):
    """
    Build dataset arrays (X, y) from folder structure.
    Includes class balancing and audio augmentation.
    """
    class_order = cfg["classes"]
    files, labels = discover(data_dir, class_order)
    if len(files) == 0:
        raise RuntimeError(f"No audio found under {data_dir}")

    # Count class samples
    counts = {i: 0 for i in range(len(class_order))}
    for y in labels:
        counts[y] += 1
    max_count = max(counts.values()) if balance else None

    # Config params
    sr = cfg["sample_rate"]
    dur = cfg["duration_sec"]
    n_fft = cfg["n_fft"]
    hop = cfg["hop_length"]
    win = cfg["win_length"]
    T = target_frames(sr, dur, hop, n_fft)

    X, y = [], []

    print(f"📁 Preparing data from {data_dir} ...")
    for path, cls in zip(files, labels):
        y_raw, sr = load_audio(path, sr=sr, duration_sec=dur, mono=cfg["mono"])

        # Extract features (Mel or MFCC)
        if cfg["feature_type"] == "mel":
            F = compute_melspec(y_raw, sr, cfg["n_mels"], n_fft, hop, win)
        else:
            F = compute_mfcc_stack(y_raw, sr, cfg["n_mfcc"], n_fft, hop, win)

        F = pad_or_trim(F, T)
        X.append(np.expand_dims(F, -1))
        y.append(cls)

        # ---- Augmentation Section ----
        if balance and counts[cls] < max_count:
            reps = int(max(0, (max_count - counts[cls]) // max(1, counts[cls])))
            reps = max(reps, aug_multiplier - 1)
            for _ in range(reps):
                y_aug = augment(y_raw, sr)
                if cfg["feature_type"] == "mel":
                    F_aug = compute_melspec(y_aug, sr, cfg["n_mels"], n_fft, hop, win)
                else:
                    F_aug = compute_mfcc_stack(y_aug, sr, cfg["n_mfcc"], n_fft, hop, win)
                F_aug = pad_or_trim(F_aug, T)
                X.append(np.expand_dims(F_aug, -1))
                y.append(cls)

    X = np.stack(X).astype(np.float32)
    y = np.array(y, dtype=np.int32)

    print(f"✅ Dataset built: {X.shape}, Labels: {y.shape}")
    return X, y, class_order
