import os
import cv2
import numpy as np
import base64
from app.ai_engine import get_ai_engine

def verify_integration():
    print("Testing GATIQ AI Engine with Super-Resolution integration...")
    
    # Check if we can get the engine
    try:
        engine = get_ai_engine()
        print("✅ AI Engine initialized successfully.")
    except Exception as e:
        print(f"❌ Failed to initialize AI Engine: {e}")
        return

    # Check SR Module status
    if engine.sr_engine.session:
        print("✅ AI Super-Resolution Model loaded and active.")
    else:
        print("⚠️ AI Super-Resolution Model not found (sr_model.onnx). Engine will run in standard mode.")

    # Create dummy image
    dummy_img = np.zeros((100, 200, 3), dtype=np.uint8)
    cv2.putText(dummy_img, "MH12AB1234", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    
    # Test get_variants
    variants = engine.get_variants(dummy_img)
    variant_names = [v[0] for v in variants]
    print(f"Detected variants: {variant_names}")
    
    if "ai_super_res" in variant_names:
        print("✅ 'ai_super_res' variant is being generated.")
    else:
        print("ℹ️ 'ai_super_res' variant skipped (no model).")

    print("\nVerification Complete.")

if __name__ == "__main__":
    verify_integration()
