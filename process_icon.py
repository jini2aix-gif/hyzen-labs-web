from PIL import Image, ImageChops
import os

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

source_path = r"C:\Users\jini2\.gemini\antigravity\brain\cf98d005-b778-4f21-97fd-3d3013369832\media__1770996906670.png"
dest_path_pwa = r"c:\HYZEN-LABS-WEB\public\pwa-icon.png"
dest_path_ios = r"c:\HYZEN-LABS-WEB\public\apple-touch-icon.png"

try:
    img = Image.open(source_path)
    print(f"Original size: {img.size}")
    
    # 1. Trim (Crop to content)
    # Assuming black background is the 'empty' space based on previous context, or just bounding box of non-uniform color.
    # The 'trim' function above works well for uniform background (like black).
    trimmed_img = trim(img)
    print(f"Trimmed size: {trimmed_img.size}")

    # 2. Resize to 512x512 (Contain or Fill?)
    # User said "trim to boundary", implying they want the content to be the icon.
    # PWA icons should be square. If trimmed is not square, we should center it on a black background?
    # Or just stretch? usually "trim" means remove wasted space.
    # I'll resize the MAX dimension to 512, and center it on a 512x512 black canvas.
    
    final_size = (512, 512)
    new_img = Image.new("RGBA", final_size, (0, 0, 0, 255)) # Black background
    
    # Calculate aspect ratio
    width, height = trimmed_img.size
    ratio = min(final_size[0]/width, final_size[1]/height)
    new_w = int(width * ratio)
    new_h = int(height * ratio)
    
    resized_trimmed = trimmed_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center
    paste_x = (final_size[0] - new_w) // 2
    paste_y = (final_size[1] - new_h) // 2
    
    new_img.paste(resized_trimmed, (paste_x, paste_y))
    
    new_img.save(dest_path_pwa)
    new_img.save(dest_path_ios)
    print("Files saved successfully.")
    
except Exception as e:
    print(f"Error: {e}")
