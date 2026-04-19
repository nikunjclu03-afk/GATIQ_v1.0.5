class VehicleModule:
    @staticmethod
    def identify_vehicle(box_cls, conf, box_xyxy, names_dict):
        """
        Translates raw YOLO output into clear Vehicle Object definitions.
        Ensures we only accept valid vehicles over a confidence threshold.
        """
        v_cls = int(box_cls)
        v_conf = float(conf)
        
        # Valid coco dataset vehicle class indices for YOLO:
        # 2: car, 3: motorcycle, 5: bus, 7: truck
        if v_cls in [2, 3, 5, 7] and v_conf > 0.4:
            vx1, vy1, vx2, vy2 = map(int, box_xyxy)
            v_type = names_dict[v_cls].capitalize()
            return {
                "is_valid": True,
                "bbox": (vx1, vy1, vx2, vy2),
                "type": v_type,
                "confidence": v_conf
            }
            
        return {"is_valid": False}
