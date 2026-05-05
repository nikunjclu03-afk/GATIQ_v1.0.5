import cv2
import numpy as np
import onnxruntime as ort
import os

class SuperResolutionModule:
    """
    Handles AI Super-Resolution (SR) using lightweight ONNX models
    (like FSRCNN or ESPCN) to enhance number plate clarity.
    """
    def __init__(self, model_path, scale=3):
        self.scale = scale
        if not os.path.exists(model_path):
            print(f"WARNING: SR Model missing at {model_path}. AI SR will be disabled.")
            self.session = None
            return

        print(f"Loading AI Super-Resolution model: {model_path}")
        # Use CPU Provider for local desktop compatibility
        self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name

    def upscale(self, img):
        """
        Upscales a low-res crop using the AI model.
        Returns the upscaled image or the original if model is missing.
        """
        if self.session is None or img is None or img.size == 0:
            return img

        # 1. Preprocessing
        # Most lightweight SR models expect input in [0, 1] range
        # and NCHW format (1, 3, H, W)
        blob = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = blob.shape[:2]
        blob = blob.astype(np.float32) / 255.0
        blob = np.transpose(blob, (2, 0, 1))
        blob = np.expand_dims(blob, axis=0)

        # 2. Inference
        try:
            outputs = self.session.run(None, {self.input_name: blob})
            output = outputs[0][0] # Shape: (3, H*scale, W*scale)
        except Exception as e:
            print(f"AI SR Inference Error: {e}")
            return img

        # 3. Post-processing
        output = np.transpose(output, (1, 2, 0)) # HWC
        output = np.clip(output * 255.0, 0, 255).astype(np.uint8)
        output = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)

        return output
