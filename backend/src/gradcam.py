import numpy as np
import tensorflow as tf
import matplotlib.cm as cm
from tensorflow.keras.preprocessing.image import img_to_array, array_to_img
import os
import uuid

def generate_gradcam_heatmap(model, img_array, layer_name="last_conv", class_index=None):
    """
    Optimized core Grad-CAM mathematical generation.
    """
    # 1. Create a model that maps the input image to the activations of the last conv layer
    grad_model = tf.keras.models.Model(
        [model.inputs], 
        [model.get_layer(layer_name).output, model.output]
    )

    # 2. Compute the gradient of the top predicted class for our input image
    with tf.GradientTape() as tape:
        conv_out, preds = grad_model(img_array, training=False)
        if class_index is None:
            class_index = tf.argmax(preds[0])
        loss = preds[:, class_index]

    # 3. Extract gradients and apply pooling
    grads = tape.gradient(loss, conv_out)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # 4. Matrix multiplication (Much faster than tf.multiply + reduce_sum)
    conv_out = conv_out[0]
    heatmap = conv_out @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    # 5. Normalize the heatmap between 0 and 1
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
    return heatmap.numpy()


def save_gradcam_image(img_array, heatmap, save_dir="heatmaps", alpha=0.5):
    """
    Resizes the heatmap, applies a thermal color map, overlays it on the 
    original spectrogram, and saves it for the FastAPI backend to serve.
    """
    os.makedirs(save_dir, exist_ok=True)

    # 1. Rescale heatmap to a range 0-255
    heatmap = np.uint8(255 * heatmap)

    # 2. Use matplotlib's jet colormap to colorize the heatmap
    jet = cm.get_cmap("jet")
    
    # Get the RGB values of the colormap (drop the alpha channel)
    jet_colors = jet(np.arange(256))[:, :3]
    jet_heatmap = jet_colors[heatmap]

    # 3. Create an image with RGB colorized heatmap
    jet_heatmap = tf.keras.preprocessing.image.array_to_img(jet_heatmap)
    
    # Resize the heatmap to match the original spectrogram dimensions
    original_shape = (img_array.shape[1], img_array.shape[2])
    jet_heatmap = jet_heatmap.resize(original_shape)
    jet_heatmap = tf.keras.preprocessing.image.img_to_array(jet_heatmap)

    # 4. Superimpose the heatmap onto the original image
    # Note: Assumes img_array is normalized between 0-1, so we convert it to 0-255
    original_img = img_array[0] * 255.0 if np.max(img_array) <= 1.0 else img_array[0]
    
    superimposed_img = jet_heatmap * alpha + original_img
    superimposed_img = tf.keras.preprocessing.image.array_to_img(superimposed_img)

    # 5. Save the image with a unique filename
    filename = f"cam_{uuid.uuid4().hex[:8]}.png"
    filepath = os.path.join(save_dir, filename)
    superimposed_img.save(filepath)

    return filename


# ==========================================
# MAIN FUNCTION CALL FOR YOUR FASTAPI SERVER
# ==========================================
def process_explainable_ai(model, img_array, layer_name="last_conv"):
    """
    Call this function from your FastAPI endpoint.
    It returns the filename that React needs to display the image.
    """
    # Generate the math
    heatmap = generate_heatmap(model, img_array, layer_name)
    
    # Generate the visual and save it
    filename = save_gradcam_image(img_array, heatmap, save_dir="heatmaps")
    
    return filename