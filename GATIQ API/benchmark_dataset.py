import argparse
import base64
import csv
import difflib
import json
import os
import time
from typing import Dict, List, Optional

from app.ai_engine import get_ai_engine


def normalize_plate(value: str) -> str:
    return "".join(ch for ch in str(value or "").upper() if ch.isalnum())


def load_manifest(manifest_path: str) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    with open(manifest_path, "r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"image_path", "expected_plate"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise ValueError(
                f"Manifest is missing required columns: {', '.join(sorted(missing))}"
            )
        for row in reader:
            rows.append({key: (value or "").strip() for key, value in row.items()})
    if not rows:
        raise ValueError("Manifest is empty.")
    return rows


def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as handle:
        return base64.b64encode(handle.read()).decode("utf-8")


def pick_primary_detection(results: List[Dict[str, str]]) -> Dict[str, str]:
    if not results:
        return {
            "plate_number": "UNREADABLE",
            "direction": "",
            "tagging": "",
            "vehicle_type": "",
        }
    for item in results:
        if normalize_plate(item.get("plate_number")) not in {"", "UNREADABLE"}:
            return item
    return results[0]


def compare_direction(expected: str, predicted: str) -> Optional[bool]:
    expected_norm = str(expected or "").strip().lower()
    predicted_norm = str(predicted or "").strip().lower()
    if not expected_norm:
        return None
    return expected_norm == predicted_norm


def plate_similarity(expected: str, predicted: str) -> float:
    return difflib.SequenceMatcher(None, normalize_plate(expected), normalize_plate(predicted)).ratio()


def classify_failure(expected_plate: str, predicted_plate: str, diagnostics: Dict[str, object]) -> str:
    predicted_norm = normalize_plate(predicted_plate)
    if predicted_norm == normalize_plate(expected_plate):
        return "match"

    plate_candidates = int(diagnostics.get("plate_candidates_above_threshold", 0) or 0)
    fallback_used = bool(diagnostics.get("fallback_used"))
    fallback_text = normalize_plate(diagnostics.get("fallback_text_corrected", ""))

    if plate_candidates == 0 and not fallback_text:
        return "detector_miss"
    if plate_candidates == 0 and fallback_used:
        return "detector_miss_fallback_ocr_wrong"
    if plate_candidates > 0 and predicted_norm in {"", "UNREADABLE"}:
        return "ocr_unreadable_after_detection"
    if plate_candidates > 0:
        return "ocr_wrong_read_after_detection"
    return "unknown_failure"


def benchmark_manifest(manifest_path: str) -> Dict[str, object]:
    rows = load_manifest(manifest_path)
    engine = get_ai_engine()
    started_at = time.time()

    exact_matches = 0
    normalized_matches = 0
    partial_matches = 0
    unreadable_predictions = 0
    direction_total = 0
    direction_matches = 0
    total_detection_seconds = 0.0
    failure_buckets: Dict[str, int] = {}
    per_image: List[Dict[str, object]] = []

    manifest_dir = os.path.dirname(os.path.abspath(manifest_path))

    for index, row in enumerate(rows, start=1):
        image_path = row["image_path"]
        expected_plate = row["expected_plate"]
        expected_direction = row.get("expected_direction", "")
        resolved_path = image_path
        if not os.path.isabs(resolved_path):
            resolved_path = os.path.join(manifest_dir, resolved_path)
        resolved_path = os.path.abspath(resolved_path)

        if not os.path.exists(resolved_path):
            raise FileNotFoundError(f"Image not found: {resolved_path}")

        image_base64 = encode_image(resolved_path)
        scan_started_at = time.time()
        results, diagnostics = engine.process_image_detailed(image_base64)
        detection_seconds = time.time() - scan_started_at
        total_detection_seconds += detection_seconds

        primary = pick_primary_detection(results)
        predicted_plate = str(primary.get("plate_number", "UNREADABLE") or "UNREADABLE").strip()
        predicted_direction = str(primary.get("direction", "") or "").strip()

        exact_match = predicted_plate.upper() == expected_plate.upper()
        normalized_match = normalize_plate(predicted_plate) == normalize_plate(expected_plate)
        similarity = plate_similarity(expected_plate, predicted_plate)
        partial_match = (not normalized_match) and similarity >= 0.7
        direction_match = compare_direction(expected_direction, predicted_direction)
        failure_reason = classify_failure(expected_plate, predicted_plate, diagnostics)

        if exact_match:
            exact_matches += 1
        if normalized_match:
            normalized_matches += 1
        if partial_match:
            partial_matches += 1
        if normalize_plate(predicted_plate) in {"", "UNREADABLE"}:
            unreadable_predictions += 1
        if direction_match is not None:
            direction_total += 1
            if direction_match:
                direction_matches += 1
        failure_buckets[failure_reason] = failure_buckets.get(failure_reason, 0) + 1

        per_image.append(
            {
                "index": index,
                "image_path": resolved_path,
                "expected_plate": expected_plate,
                "predicted_plate": predicted_plate,
                "exact_match": exact_match,
                "normalized_match": normalized_match,
                "partial_match": partial_match,
                "similarity": round(similarity, 3),
                "expected_direction": expected_direction,
                "predicted_direction": predicted_direction,
                "direction_match": direction_match,
                "vehicle_type": primary.get("vehicle_type", ""),
                "tagging": primary.get("tagging", ""),
                "raw_detection_count": len(results),
                "detection_seconds": round(detection_seconds, 3),
                "failure_reason": failure_reason,
                "diagnostics": diagnostics,
            }
        )

    total = len(rows)
    return {
        "manifest_path": os.path.abspath(manifest_path),
        "total_images": total,
        "exact_match_rate": round((exact_matches / total) * 100, 2),
        "normalized_match_rate": round((normalized_matches / total) * 100, 2),
        "partial_match_rate": round((partial_matches / total) * 100, 2),
        "unreadable_rate": round((unreadable_predictions / total) * 100, 2),
        "direction_accuracy": round((direction_matches / direction_total) * 100, 2) if direction_total else None,
        "direction_samples": direction_total,
        "average_detection_seconds": round(total_detection_seconds / total, 3),
        "total_runtime_seconds": round(time.time() - started_at, 3),
        "failure_buckets": failure_buckets,
        "results": per_image,
    }


def print_summary(report: Dict[str, object]) -> None:
    print("\n=== GATIQ Benchmark Summary ===")
    print(f"Manifest: {report['manifest_path']}")
    print(f"Images: {report['total_images']}")
    print(f"Exact plate match: {report['exact_match_rate']}%")
    print(f"Normalized plate match: {report['normalized_match_rate']}%")
    print(f"Partial plate match: {report['partial_match_rate']}%")
    print(f"Unreadable prediction rate: {report['unreadable_rate']}%")
    if report["direction_accuracy"] is None:
        print("Direction accuracy: N/A (no expected_direction values supplied)")
    else:
        print(
            f"Direction accuracy: {report['direction_accuracy']}% "
            f"over {report['direction_samples']} labeled samples"
        )
    print(f"Average detection time: {report['average_detection_seconds']}s")
    print(f"Total benchmark time: {report['total_runtime_seconds']}s")
    print(f"Failure buckets: {json.dumps(report['failure_buckets'], ensure_ascii=True)}")

    print("\n=== Per Image Results ===")
    for item in report["results"]:
        direction_text = ""
        if item["direction_match"] is not None:
            direction_text = (
                f" | direction={item['predicted_direction']} "
                f"(expected {item['expected_direction']}) "
                f"[{'OK' if item['direction_match'] else 'MISS'}]"
            )
        print(
            f"{item['index']:>3}. "
            f"{os.path.basename(item['image_path'])} | "
            f"predicted={item['predicted_plate']} | "
            f"expected={item['expected_plate']} | "
            f"exact={'OK' if item['exact_match'] else 'MISS'} | "
            f"normalized={'OK' if item['normalized_match'] else 'MISS'} | "
            f"partial={'OK' if item['partial_match'] else 'MISS'} | "
            f"similarity={item['similarity']} | "
            f"reason={item['failure_reason']} | "
            f"time={item['detection_seconds']}s"
            f"{direction_text}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Benchmark GATIQ plate OCR accuracy against a labeled CSV manifest."
    )
    parser.add_argument(
        "manifest",
        help="Path to CSV file with image_path, expected_plate and optional expected_direction columns.",
    )
    parser.add_argument(
        "--json-out",
        help="Optional path to save the full benchmark report as JSON.",
    )
    args = parser.parse_args()

    report = benchmark_manifest(args.manifest)
    print_summary(report)

    if args.json_out:
        output_path = os.path.abspath(args.json_out)
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2)
        print(f"\nSaved JSON report to: {output_path}")


if __name__ == "__main__":
    main()
