# src/model.py
import tensorflow as tf
from tensorflow.keras import layers, models

def build_model(cfg, num_classes):
    """
    CNN model for audio classification with fixed input shape.
    """
    # From dataset: (120, 297, 1)
    input_shape = (120, 297, 1)

    model = models.Sequential([
        layers.Input(shape=input_shape),
        layers.Conv2D(32, (3, 3), activation="relu"),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation="relu"),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(128, (3, 3), activation="relu"),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(128, activation="relu"),
        layers.Dense(num_classes, activation="softmax")
    ])
    return model
