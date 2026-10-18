import os
from django.core.exceptions import ValidationError
from PIL import Image

MAX_FILE_SIZE_MB = 5
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}

def validate_image_file(file):
    # 1. Size check
    if file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValidationError(f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_MB}MB.")

    # 2. Extension check
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}."
        )

    # 3. Content inspection using Pillow to prevent polyglot / executable files
    try:
        file.seek(0)
        img = Image.open(file)
        img.verify()
        file.seek(0)
    except Exception:
        raise ValidationError("Invalid or corrupted image file.")
