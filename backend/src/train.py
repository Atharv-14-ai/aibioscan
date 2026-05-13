import os
import argparse
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras.callbacks import ModelCheckpoint
from src.dataset import build_numpy
from src.model import build_model
from src.utils import load_config
import json

def train(data_dir, cfg):
    print("📂 Loading dataset...")
    X, y, class_names = build_numpy(data_dir, cfg, balance=True, aug_multiplier=2)
    print(f"Dataset loaded: {X.shape}, Labels: {y.shape}")

    # Train-test split
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Build model
    model = build_model(cfg, num_classes=len(cfg["classes"]))

    # ✅ FIX: use sparse categorical crossentropy (works with integer labels)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=cfg["learning_rate"]),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    # Ensure model directory exists
    os.makedirs(cfg["model_dir"], exist_ok=True)

    # Checkpoint callback
    checkpoint = ModelCheckpoint(
        filepath=os.path.join(cfg["model_dir"], cfg["model_name"]),
        monitor="val_accuracy",
        save_best_only=True,
        verbose=1
    )

    print("🚀 Training started...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=cfg["epochs"],
        batch_size=cfg["batch_size"],
        callbacks=[checkpoint]
    )

    # Save final model
    final_model_path = os.path.join(cfg["model_dir"], cfg["model_name"])
    model.save(final_model_path)
    print(f"✅ Model saved to {final_model_path}")

    # Save label map
    label_map = {i: c for i, c in enumerate(class_names)}
    with open(os.path.join(cfg["model_dir"], "label_map.json"), "w") as f:
        json.dump(label_map, f)
    print("✅ Label map saved to models/label_map.json")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", type=str, required=True)
    args = parser.parse_args()

    cfg = load_config("config.yaml")
    train(args.data_dir, cfg)

if __name__ == "__main__":
    main()
