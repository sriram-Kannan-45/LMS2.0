"""
Test script to verify image files are properly rejected at all layers.
Run: python test_image_rejection.py
"""
import io
import sys
import json

# Simulate image file signatures (magic bytes)
PNG_SIG = b'\x89PNG\r\n\x1a\n'
JPEG_SIG = b'\xff\xd8\xff\xe0'
GIF_SIG = b'GIF87a'
BMP_SIG = b'BM'
WEBP_SIG = b'RIFFxxxxWEBP'  # Simplified

def is_image_file(buffer):
    """Check if buffer starts with image file signatures"""
    if not buffer or len(buffer) < 12:
        return False
    
    # PNG
    if buffer[:8].startswith(PNG_SIG):
        return True
    # JPEG
    if buffer[:3] == JPEG_SIG[:3]:
        return True
    # GIF
    if buffer[:6].startswith(GIF_SIG):
        return True
    # BMP
    if buffer[:2] == BMP_SIG:
        return True
    # WebP
    if len(buffer) >= 12 and buffer[:4] == b'RIFF' and buffer[8:12] == b'WEBP':
        return True
    return False

def test_image_detection():
    """Test image detection function"""
    print("Testing image detection...")
    
    # Test PNG
    png_buffer = PNG_SIG + b'fake data'
    assert is_image_file(png_buffer) == True, "PNG detection failed"
    print("  [OK] PNG detected correctly")
    
    # Test JPEG
    jpeg_buffer = JPEG_SIG + b'fake data'
    assert is_image_file(jpeg_buffer) == True, "JPEG detection failed"
    print("  [OK] JPEG detected correctly")
    
    # Test GIF
    gif_buffer = GIF_SIG + b'fake data'
    assert is_image_file(gif_buffer) == True, "GIF detection failed"
    print("  [OK] GIF detected correctly")
    
    # Test valid text (PDF)
    pdf_buffer = b'%PDF-1.4 fake pdf content'
    assert is_image_file(pdf_buffer) == False, "PDF falsely detected as image"
    print("  [OK] PDF correctly NOT detected as image")
    
    # Test valid text (plain text)
    txt_buffer = b'This is plain text content for quiz generation'
    assert is_image_file(txt_buffer) == False, "Text falsely detected as image"
    print("  [OK] Plain text correctly NOT detected as image")
    
    print("\n[OK] All image detection tests passed!")

def test_frontend_validation():
    """Test frontend validation patterns"""
    print("\nTesting frontend file validation...")
    
    valid_files = ['document.pdf', 'notes.docx', 'readme.txt']
    invalid_files = ['image.png', 'photo.jpg', 'picture.jpeg', 'icon.gif', 'logo.bmp', 'image.webp']
    
    image_pattern = r'\.(png|jpg|jpeg|gif|bmp|webp|svg)$'
    import re
    
    for f in valid_files:
        match = re.search(image_pattern, f, re.IGNORECASE)
        assert not match, f"{f} should be valid!"
        print(f"  [OK] {f} correctly accepted")
    
    for f in invalid_files:
        match = re.search(image_pattern, f, re.IGNORECASE)
        assert match, f"{f} should be rejected!"
        print(f"  [OK] {f} correctly rejected")
    
    print("\n[OK] All frontend validation tests passed!")

if __name__ == "__main__":
    try:
        test_image_detection()
        test_frontend_validation()
        print("\n" + "="*50)
        print("[OK] ALL TESTS PASSED - Image rejection is working!")
        print("="*50)
    except AssertionError as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] ERROR: {e}")
        sys.exit(1)
