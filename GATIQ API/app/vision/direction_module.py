import cv2
import numpy as np

class DirectionModule:
    @staticmethod
    def detect_vehicle_side(vehicle_crop):
        """
        Heuristic to distinguish Front vs Back.
        Rear usually has red tail lights. 
        Works by detecting red blobs in the vehicle crop.
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return "Entry" # Default to Entry
        
        hsv = cv2.cvtColor(vehicle_crop, cv2.COLOR_BGR2HSV)
        
        # Define range for RED color (typical for tail lights)
        lower_red1 = np.array([0, 70, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50])
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = cv2.add(mask1, mask2)
        
        red_pixel_count = cv2.countNonZero(red_mask)
        total_pixels = vehicle_crop.shape[0] * vehicle_crop.shape[1]
        red_ratio = red_pixel_count / total_pixels
        
        return "Exit" if red_ratio > 0.005 else "Entry"
