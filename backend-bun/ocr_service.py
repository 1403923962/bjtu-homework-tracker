#!/usr/bin/env python3
"""
Simple OCR service using ddddocr
Usage: python ocr_service.py <image_path>
"""
import sys
import ddddocr

def recognize_captcha(image_path):
    """Recognize captcha using ddddocr"""
    try:
        ocr = ddddocr.DdddOcr(show_ad=False)

        with open(image_path, 'rb') as f:
            image_bytes = f.read()

        result = ocr.classification(image_bytes)
        return result
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return ""

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ocr_service.py <image_path>", file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]
    result = recognize_captcha(image_path)

    # Output only the result (no extra text)
    print(result)
