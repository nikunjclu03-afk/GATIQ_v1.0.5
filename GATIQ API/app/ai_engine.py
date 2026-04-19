import cv2
import numpy as np
from ultralytics import YOLO
from rapidocr_onnxruntime import RapidOCR
import os
import re
import base64
from app.vision.direction_module import DirectionModule
from app.vision.ocr_module import OCRModule
from app.vision.vehicle_module import VehicleModule
from datetime import datetime


def _is_lfs_pointer(file_path):
    try:
        with open(file_path, "rb") as handle:
            header = handle.read(256)
        return header.startswith(b"version https://git-lfs.github.com/spec/v1")
    except OSError:
        return False


def _assert_local_model(file_path, label, min_bytes=1024):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"{label} missing at {file_path}")
    if os.path.getsize(file_path) < min_bytes or _is_lfs_pointer(file_path):
        raise RuntimeError(
            f"{label} is not bundled correctly at {file_path}. "
            "The desktop build requires real offline model files, not Git LFS pointers."
        )

class GatiqLocalAI:
    def __init__(self):
        # Base directory
        self.base_dir = os.getenv("GATIQ_MODEL_DIR", os.path.dirname(os.path.dirname(__file__)))
        
        # 1. Plate Detector (Custom Trained)
        model_path = os.path.join(self.base_dir, "best.onnx")
        _assert_local_model(model_path, "Plate detector model")
        print(f"Loading custom Plate Detector from: {model_path}")
        self.detector = YOLO(model_path, task='detect') 
        
        # 2. Vehicle Classifier (Standard YOLOv8n)
        # Included for vehicle type (Car, Bike, etc.)
        vehicle_model_path = os.path.join(self.base_dir, "yolov8n.pt")
        _assert_local_model(vehicle_model_path, "Vehicle classifier model")
        print(f"Loading Vehicle Classifier from: {vehicle_model_path}")
        self.vehicle_detector = YOLO(vehicle_model_path)
        
        # 3. OCR Engine (RapidOCR - PaddleOCR ONNX models, faster & more accurate)
        print("Loading RapidOCR (PaddleOCR ONNX) engine...")
        self.ocr = RapidOCR()
        
        # Debug folder setup
        self.debug_dir = os.getenv("GATIQ_DEBUG_DIR", os.path.join(self.base_dir, "debug_scans"))
        if not os.path.exists(self.debug_dir):
            os.makedirs(self.debug_dir)
            
        # Strict Indian Plate Regex
        self.plate_pattern = re.compile(r'^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$')



    def get_variants(self, crop):
        """Generates 5 optimized image variants for accurate OCR."""
        if crop is None or crop.size == 0:
            return []
        
        variants = []
        
        # Upscale 3x for digit clarity
        v1 = cv2.resize(crop, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
        variants.append(("original_3x", v1))
        
        gray = cv2.cvtColor(v1, cv2.COLOR_BGR2GRAY)
        
        # Variant 2: Sharpened Grayscale
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        v2 = cv2.filter2D(gray, -1, kernel)
        variants.append(("sharpened_gray", v2))
        
        # Variant 3: CLAHE (best for faded/low-contrast plates)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        v3 = clahe.apply(gray)
        variants.append(("clahe", v3))
        
        # Variant 4: Otsu Threshold (auto-optimal binarization)
        _, v4 = cv2.threshold(v3, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(("otsu", v4))

        # Variant 5: Adaptive Threshold on denoised
        v5_denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        v5 = cv2.adaptiveThreshold(v5_denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
        variants.append(("adaptive_thresh", v5))
        
        return variants







    def _process_core(self, img, include_diagnostics=False):
        if img is None: return []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        diagnostics = {
            "vehicle_candidates": 0,
            "vehicles_found": 0,
            "plate_candidates_raw": 0,
            "plate_candidates_above_threshold": 0,
            "fallback_used": False,
            "fallback_text_raw": "",
            "fallback_text_corrected": "",
            "plate_diagnostics": [],
        }

        # 1. Broad Vehicle Detection
        vehicle_results = self.vehicle_detector(img, verbose=False)[0]
        vehicles_found = []
        diagnostics["vehicle_candidates"] = len(vehicle_results.boxes)
        for v_box in vehicle_results.boxes:
            v_cls = int(v_box.cls[0])
            v_conf = float(v_box.conf[0])
            v_data = VehicleModule.identify_vehicle(v_box.cls[0], v_box.conf[0], v_box.xyxy[0], vehicle_results.names)
            if v_data['is_valid']:
                vx1, vy1, vx2, vy2 = v_data['bbox']
                v_crop = img[vy1:vy2, vx1:vx2]
                v_type = v_data['type']
                v_side = DirectionModule.detect_vehicle_side(v_crop)
                vehicles_found.append({
                    "bbox": (vx1, vy1, vx2, vy2),
                    "type": v_type,
                    "side": v_side
                })
        diagnostics["vehicles_found"] = len(vehicles_found)

        # 2. Precise Plate Detection
        plate_results = self.detector(img, verbose=False)[0]
        detections = []
        diagnostics["plate_candidates_raw"] = len(plate_results.boxes)
        
        for idx, p_box in enumerate(plate_results.boxes):
            conf = float(p_box.conf[0])
            if conf < 0.3: continue
            diagnostics["plate_candidates_above_threshold"] += 1
            
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
                result, _ = self.ocr(v_img)
                ocr_out = [line[1] for line in result] if result else []
                raw_text = "".join(ocr_out).replace(" ", "").upper()
                corrected = OCRModule.apply_segment_correction(raw_text)
                score = OCRModule.score_candidate(corrected)
                candidates.append({"text": corrected, "score": score, "variant": v_name, "raw": raw_text})

            # Best Candidate via Consensus Voting
            best_cand = None
            if candidates:
                best_cand = OCRModule.consensus_vote(candidates)
                if best_cand and best_cand["score"] >= 20:
                    final_plate = best_cand["text"]
                else:
                    best_cand = max(candidates, key=lambda x: x["score"])
                    final_plate = best_cand["text"] if best_cand["score"] >= 20 else "UNREADABLE"
            else:
                final_plate = "UNREADABLE"

            diagnostics["plate_diagnostics"].append({
                "bbox": [px1, py1, px2, py2],
                "detector_confidence": round(conf, 4),
                "vehicle_type": v_type,
                "direction": v_side,
                "final_plate": final_plate,
                "accepted_candidate": best_cand,
                "candidates": candidates,
            })
            
            tagging_val = "Unknown"
            purpose_val = "Unknown"
            
            detections.append({
                "plate_number": final_plate,
                "direction": v_side, 
                "tagging": tagging_val,
                "purpose": purpose_val,
                "vehicle_type": v_type,
                "debug": {"conf": conf, "best_variant": best_cand["variant"] if best_cand else "none"}
            })

        # Fallback
        if not detections:
            diagnostics["fallback_used"] = True
            gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            result, _ = self.ocr(gray_img)
            ocr_out = [line[1] for line in result] if result else []
            raw_text = "".join(ocr_out).replace(" ", "").upper()
            corrected = OCRModule.apply_segment_correction(raw_text)
            diagnostics["fallback_text_raw"] = raw_text
            diagnostics["fallback_text_corrected"] = corrected
            if len(corrected) >= 7:
                tagging_val = "Unknown"
                purpose_val = "Unknown"
                detections.append({
                    "plate_number": corrected, "direction": "Entry", "tagging": tagging_val, "purpose": purpose_val, "vehicle_type": "Car"
                })

        if include_diagnostics:
            return detections, diagnostics
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

    def process_image_detailed(self, base64_image):
        try:
            img_data = base64.b64decode(base64_image.split(",")[-1])
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Error decoding image: {e}")
            return [], {
                "decode_error": str(e),
                "vehicle_candidates": 0,
                "vehicles_found": 0,
                "plate_candidates_raw": 0,
                "plate_candidates_above_threshold": 0,
                "fallback_used": False,
                "fallback_text_raw": "",
                "fallback_text_corrected": "",
                "plate_diagnostics": [],
            }

        return self._process_core(img, include_diagnostics=True)

# Global instance
engine = None
def get_ai_engine():
    global engine
    if engine is None: engine = GatiqLocalAI()
    return engine


