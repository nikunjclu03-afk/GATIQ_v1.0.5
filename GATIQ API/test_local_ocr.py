import cv2
import easyocr
from ultralytics import YOLO
import numpy as np
import time

# Load the local model
print("Loading YOLOv8 model...")
model = YOLO('best.onnx', task='detect')

# Initialize EasyOCR
print("Initializing EasyOCR...")
reader = easyocr.Reader(['en'])

def process_image(image_path):
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image at {image_path}")
        return

    # Detection
    print("Running detection...")
    results = model(img)
    
    # Process results
    for result in results:
        boxes = result.boxes
        for box in boxes:
            # Get box coordinates
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = box.conf[0].item()
            
            if conf > 0.4:  # Confidence threshold
                # Crop the plate
                plate_img = img[int(y1):int(y2), int(x1):int(x2)]
                
                # Perform OCR
                print("Running OCR on detected plate...")
                ocr_result = reader.readtext(plate_img)
                
                # Extract text
                text = ""
                for detection in ocr_result:
                    text += detection[1] + " "
                
                print(f"Plate Detected: {text.strip()} (Confidence: {conf:.2f})")
                
                # Draw on image
                cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                cv2.putText(img, text.strip(), (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    # Save result
    cv2.imwrite('output_test.jpg', img)
    print("Result saved as output_test.jpg")

if __name__ == "__main__":
    test_img = r"QAT_Dataset_New\test\images\AP10_jpg.rf.cddd20aa1f26ae33dddd925fc96498ea.jpg"
    process_image(test_img)
