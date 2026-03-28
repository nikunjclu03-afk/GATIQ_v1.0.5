import cv2
import numpy as np
from ultralytics import YOLO
import easyocr
import os
import re
import base64
import time
from datetime import datetime

class GatiqLocalAI:
    def __init__(self):
        # Base directory
        self.base_dir = os.getenv("GATIQ_MODEL_DIR", os.path.dirname(os.path.dirname(__file__)))
        
        # 1. Plate Detector (Custom Trained)
        model_path = os.path.join(self.base_dir, "best.onnx")
        print(f"Loading custom Plate Detector from: {model_path}")
        self.detector = YOLO(model_path, task='detect') 
        
        # 2. Vehicle Classifier (Standard YOLOv8n)
        # Included for vehicle type (Car, Bike, etc.)
        vehicle_model_path = os.path.join(self.base_dir, "yolov8n.pt")
        print(f"Loading Vehicle Classifier from: {vehicle_model_path}")
        self.vehicle_detector = YOLO(vehicle_model_path)
        
        # 3. OCR Engine
        self.ocr = easyocr.Reader(['en'], gpu=False) 
        
        # Debug folder setup
        self.debug_dir = os.getenv("GATIQ_DEBUG_DIR", os.path.join(self.base_dir, "debug_scans"))
        if not os.path.exists(self.debug_dir):
            os.makedirs(self.debug_dir)
            
        # Strict Indian Plate Regex
        self.plate_pattern = re.compile(r'^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$')

    def detect_vehicle_side_heuristic(self, vehicle_crop):
        """
        Heuristic to distinguish Front vs Back.
        Rear usually has red tail lights. 
        Works by detecting red blobs in the vehicle crop.
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return "Entry" # Default to Entry
        
        # Convert to HSV for better color detection
        hsv = cv2.cvtColor(vehicle_crop, cv2.COLOR_BGR2HSV)
        
        # Define range for RED color (typical for tail lights)
        lower_red1 = np.array([0, 70, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50])
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = cv2.add(mask1, mask2)
        
        # Calculate percentage of red pixels
        red_pixel_count = cv2.countNonZero(red_mask)
        total_pixels = vehicle_crop.shape[0] * vehicle_crop.shape[1]
        red_ratio = red_pixel_count / total_pixels
        
        # If significant red is found (tail lights), it's likely the Rear/Exit
        # Threshold 0.5% (approx 1/200th of image area)
        return "Exit" if red_ratio > 0.005 else "Entry"

    def get_variants(self, crop):
        """Generates 4 different image variants for OCR testing."""
        if crop is None or crop.size == 0:
            return []
        
        variants = []
        # Upscale 2.5x
        v1 = cv2.resize(crop, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
        variants.append(("original", v1))
        
        gray = cv2.cvtColor(v1, cv2.COLOR_BGR2GRAY)
        
        # Variant 2: Grayscale + Sharpened
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        v2 = cv2.filter2D(gray, -1, kernel)
        variants.append(("sharpened_gray", v2))
        
        # Variant 3: Bilateral Filter (Denoise)
        v3 = cv2.bilateralFilter(gray, 9, 75, 75)
        variants.append(("bilateral_gray", v3))
        
        # Variant 4: Adaptive Threshold
        v4 = cv2.adaptiveThreshold(v3, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
        variants.append(("threshold", v4))
        
        return variants

    def apply_segment_correction(self, text):
        """Applies segment-aware character correction."""
        if not text or len(text) < 4: return text
        
        # Remove any stray spaces or symbols again
        text = "".join(e for e in text if e.isalnum()).upper()
        
        # Hard fixes for STATE codes
        if text.startswith("HH"): text = "MH" + text[2:]
        if text.startswith("KH"): text = "MH" + text[2:]
        if text.startswith("H11"): text = "MH" + text[3:]
        
        chars = list(text)
        # Position 0-1: State (Letters)
        for i in range(min(2, len(chars))):
            swaps = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '4': 'A'}
            chars[i] = swaps.get(chars[i], chars[i])
            
        # Position 2-3: District (Numbers)
        for i in range(2, min(4, len(chars))):
            if chars[i].isalpha():
                swaps = {'O': '0', 'I': '1', 'L': '1', 'S': '5', 'Z': '2', 'B': '8', 'G': '6', 'T': '7'}
                chars[i] = swaps.get(chars[i], chars[i])
                
        # Last 4: Number (Numbers)
        start_idx = max(len(chars) - 4, 4)
        for i in range(start_idx, len(chars)):
            if chars[i].isalpha():
                swaps = {'O': '0', 'I': '1', 'L': '1', 'S': '5', 'Z': '2', 'B': '8', 'G': '6', 'T': '7'}
                chars[i] = swaps.get(chars[i], chars[i])
                
        return "".join(chars)

    def score_candidate(self, text):
        """Scores a candidate string based on Indian plate format."""
        if not text: return 0
        score = 0
        if 7 <= len(text) <= 10: score += 15
        if self.plate_pattern.match(text): score += 60
        if text[:2] in ["MH", "DL", "HR", "UP", "KA", "TN", "GA", "RJ", "GJ", "AP", "TS", "MP", "PB", "BR", "CH", "JK"]:
            score += 10
        if len(text) >= 4 and text[2:4].isdigit(): score += 5
        return score

    def _process_core(self, img):
        if img is None: return []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # 1. Broad Vehicle Detection
        vehicle_results = self.vehicle_detector(img, verbose=False)[0]
        vehicles_found = []
        for v_box in vehicle_results.boxes:
            v_cls = int(v_box.cls[0])
            v_conf = float(v_box.conf[0])
            if v_cls in [2, 3, 5, 7] and v_conf > 0.4:
                vx1, vy1, vx2, vy2 = map(int, v_box.xyxy[0])
                v_crop = img[vy1:vy2, vx1:vx2]
                v_type = vehicle_results.names[v_cls].capitalize()
                v_side = self.detect_vehicle_side_heuristic(v_crop)
                vehicles_found.append({
                    "bbox": (vx1, vy1, vx2, vy2),
                    "type": v_type,
                    "side": v_side
                })

        # 2. Precise Plate Detection
        plate_results = self.detector(img, verbose=False)[0]
        detections = []
        
        for idx, p_box in enumerate(plate_results.boxes):
            conf = float(p_box.conf[0])
            if conf < 0.3: continue
            
            px1, py1, px2, py2 = map(int, p_box.xyxy[0])
            
            # Match plate to vehicle
            v_type = "Car"
            v_side = "Entry"
            for v in vehicles_found:
                vx1, vy1, vx2, vy2 = v["bbox"]
                if px1 >= vx1 and px2 <= vx2 and py1 >= vy1 and py2 <= vy2:
                    v_type = v["type"]
                    v_side = v["side"]
                    break

            # Process Crop
            h, w, _ = img.shape
            pad = 25
            y1_p, y2_p = max(0, py1 - pad), min(h, py2 + pad)
            x1_p, x2_p = max(0, px1 - pad), min(w, px2 + pad)
            
            crop = img[y1_p:y2_p, x1_p:x2_p]
            cv2.imwrite(os.path.join(self.debug_dir, f"{timestamp}_det_{idx}_crop.jpg"), crop)
            
            # OCR Variants
            variants = self.get_variants(crop)
            candidates = []
            
            for v_name, v_img in variants:
                cv2.imwrite(os.path.join(self.debug_dir, f"{timestamp}_det_{idx}_var_{v_name}.jpg"), v_img)
                ocr_out = self.ocr.readtext(v_img, detail=0)
                raw_text = "".join(ocr_out).replace(" ", "").upper()
                corrected = self.apply_segment_correction(raw_text)
                score = self.score_candidate(corrected)
                candidates.append({"text": corrected, "score": score, "variant": v_name, "raw": raw_text})

            # Best Candidate
            best_cand = None
            if candidates:
                best_cand = max(candidates, key=lambda x: x["score"])
                final_plate = best_cand["text"] if best_cand["score"] >= 20 else "UNREADABLE"
            else:
                final_plate = "UNREADABLE"
            
            detections.append({
                "plate_number": final_plate,
                "direction": v_side, 
                "tagging": "Resident" if any(final_plate.startswith(s) for s in ["MH", "DL", "HR", "UP", "KA", "TN", "GA", "RJ", "GJ", "AP", "TS", "MP", "PB", "BR"]) else "Non-Resident",
                "vehicle_type": v_type,
                "debug": {"conf": conf, "best_variant": best_cand["variant"] if best_cand else "none"}
            })

        # Fallback
        if not detections:
            gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            ocr_out = self.ocr.readtext(gray_img, detail=0)
            raw_text = "".join(ocr_out).replace(" ", "").upper()
            corrected = self.apply_segment_correction(raw_text)
            if len(corrected) >= 7:
                detections.append({
                    "plate_number": corrected, "direction": "Entry", "tagging": "Non-Resident", "vehicle_type": "Car"
                })

        return detections

    def process_image(self, base64_image):
        try:
            img_data = base64.b64decode(base64_image.split(",")[-1])
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Error decoding image: {e}")
            return []
        
        return self._process_core(img)

# Global instance
engine = None
def get_ai_engine():
    global engine
    if engine is None: engine = GatiqLocalAI()
    return engine
