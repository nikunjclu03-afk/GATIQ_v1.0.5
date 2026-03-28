
import cv2
import base64
import os
import sys
from app.ai_engine import get_ai_engine

def benchmark_image(image_path):
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return

    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')

    engine = get_ai_engine()
    print(f"\n--- Benchmarking Plate: {image_path} ---")
    
    results = engine.process_image(base64_image)
    
    if not results:
        print("No plates detected.")
        return

    for i, res in enumerate(results):
        print(f"\nDetection {i+1}:")
        print(f"Plate: {res['plate_number']}")
        print(f"Vehicle: {res['vehicle_type']}")
        print(f"Direction: {res['direction']}")
        print(f"Tagging: {res['tagging']}")
        print(f"Confidence: {res['debug']['conf']:.2f}")

if __name__ == "__main__":
    # Test on a few images if available
    test_imgs = ["output_test.jpg"]
    for img in test_imgs:
        benchmark_image(img)
