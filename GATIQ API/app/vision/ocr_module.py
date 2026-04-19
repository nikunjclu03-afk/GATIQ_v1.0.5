import re

# ─── Indian Number Plate Format ───
# [State: 2 Letters] [District: 2 Digits] [Series: 1-3 Letters] [Number: 4 Digits]
# Example: MH 13 A2 9456  →  MH=State, 13=District, A=Series, 2=???, 9456=Number
# But real plates can have: MH13AB1234, MH13A1234, MH13ABC1234

# Common OCR misreads:
# Letters misread as digits: A→4, B→8, S→5, O→0, I→1, Z→2, G→6, T→7
# Digits misread as letters: 0→O, 1→I/L, 2→Z, 4→A, 5→S, 6→G, 7→T, 8→B

DIGIT_TO_LETTER = {'0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'P'}
LETTER_TO_DIGIT = {'O': '0', 'I': '1', 'L': '1', 'S': '5', 'Z': '2', 'B': '8', 'G': '6', 'T': '7', 'A': '4', 'E': '3', 'P': '9'}

VALID_STATES = [
    "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DD", "DL", "GA",
    "GJ", "HR", "HP", "JH", "JK", "KA", "KL", "LA", "LD", "MH",
    "MN", "ML", "MZ", "MP", "NL", "OD", "PB", "PY", "RJ", "SK",
    "TN", "TS", "TR", "UK", "UP", "WB"
]

class OCRModule:
    plate_pattern = re.compile(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$")

    @classmethod
    def _find_series_boundary(cls, chars):
        """
        Finds where the series letters end and the final number begins.
        Indian plates: XX 00 [A-Z]{1-3} [0-9]{1-4}
        We scan backwards from the end to find the last group of digits.
        """
        if len(chars) < 6:
            return 4, len(chars)
        
        # The last 4 characters should be digits (registration number)
        # The middle part (between position 4 and len-4) should be letters (series)
        series_start = 4
        series_end = max(len(chars) - 4, 4)
        
        return series_start, series_end

    @classmethod
    def apply_segment_correction(cls, text):
        """
        Applies segment-aware character correction for Indian number plates.
        
        Segments:
          [0-1]  State Code   → MUST be letters  (digits→letters)
          [2-3]  District Code → MUST be digits   (letters→digits)
          [4..n] Series Code  → MUST be letters   (digits→letters)
          [n..]  Reg Number   → MUST be digits    (letters→digits)
        """
        if not text or len(text) < 4:
            return text
        
        # Clean: remove all non-alphanumeric, uppercase
        text = "".join(e for e in text if e.isalnum()).upper()
        
        # Hard-fix common state code misreads
        if text.startswith("HH"): text = "MH" + text[2:]
        if text.startswith("KH"): text = "MH" + text[2:]
        if text.startswith("H11"): text = "MH" + text[3:]
        if text.startswith("7N"): text = "TN" + text[2:]
        if text.startswith("D1"): text = "DL" + text[2:]
        
        chars = list(text)
        
        # ── Segment 1: State Code (positions 0-1) → Force Letters ──
        for i in range(min(2, len(chars))):
            if chars[i].isdigit():
                chars[i] = DIGIT_TO_LETTER.get(chars[i], chars[i])
            
        # ── Segment 2: District Code (positions 2-3) → Force Digits ──
        for i in range(2, min(4, len(chars))):
            if chars[i].isalpha():
                chars[i] = LETTER_TO_DIGIT.get(chars[i], chars[i])
                
        # ── Segment 3: Series Letters (positions 4 to len-4) → Force Letters ──
        series_start, series_end = cls._find_series_boundary(chars)
        for i in range(series_start, series_end):
            if chars[i].isdigit():
                chars[i] = DIGIT_TO_LETTER.get(chars[i], chars[i])
                
        # ── Segment 4: Registration Number (last 4) → Force Digits ──
        reg_start = max(len(chars) - 4, series_end)
        for i in range(reg_start, len(chars)):
            if chars[i].isalpha():
                chars[i] = LETTER_TO_DIGIT.get(chars[i], chars[i])
                
        return "".join(chars)

    @classmethod
    def score_candidate(cls, text):
        """Scores a candidate string based on Indian plate format."""
        if not text:
            return 0
        score = 0
        if 7 <= len(text) <= 10:
            score += 15
        if cls.plate_pattern.match(text):
            score += 60
        if text[:2] in VALID_STATES:
            score += 10
        if len(text) >= 4 and text[2:4].isdigit():
            score += 5
        # Bonus: if middle section has letters (series) 
        if len(text) >= 6:
            mid = text[4:max(len(text)-4, 5)]
            if mid.isalpha():
                score += 5
        return score

    @classmethod
    def consensus_vote(cls, candidates):
        """
        Multi-variant consensus voting system.
        Compares all corrected candidate reads character-by-character.
        At each position, the most frequently occurring character wins.
        This eliminates random single-variant misreads (e.g. '4' vs '1').
        
        Only considers candidates with score >= 50 (valid plate format).
        Falls back to best single candidate if consensus fails.
        """
        if not candidates:
            return None
        
        # Filter to only valid-looking plates (score >= 50)
        valid = [c for c in candidates if c["score"] >= 50]
        if not valid:
            # Fall back to highest score regardless
            return max(candidates, key=lambda x: x["score"])
        
        # Group by plate length (most common length wins)
        from collections import Counter
        length_counts = Counter(len(c["text"]) for c in valid)
        best_length = length_counts.most_common(1)[0][0]
        same_length = [c for c in valid if len(c["text"]) == best_length]
        
        if len(same_length) < 2:
            # Not enough variants agree on length, use best score
            return max(valid, key=lambda x: x["score"])
        
        # Character-by-character majority vote
        consensus_chars = []
        for pos in range(best_length):
            char_counts = Counter(c["text"][pos] for c in same_length)
            winner = char_counts.most_common(1)[0][0]
            consensus_chars.append(winner)
        
        consensus_text = "".join(consensus_chars)
        
        # Apply segment correction one final time on the consensus
        consensus_text = cls.apply_segment_correction(consensus_text)
        consensus_score = cls.score_candidate(consensus_text)
        
        return {
            "text": consensus_text,
            "score": consensus_score,
            "variant": "consensus",
            "raw": f"voted_from_{len(same_length)}_variants"
        }
