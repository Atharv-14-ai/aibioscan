import numpy as np
from sklearn.metrics import confusion_matrix, classification_report
from src.dataset import build_numpy
from src.utils import load_config
import tensorflow as tf

cfg = load_config("config.yaml")
X, y, classes = build_numpy("data", cfg, balance=False, aug_multiplier=0)
model = tf.keras.models.load_model("models/bioscan_cnn.h5")
preds = np.argmax(model.predict(X, verbose=0), axis=1)
print(classification_report(y, preds, target_names=classes))
print("Confusion matrix:")
print(confusion_matrix(y, preds))
