"""Regenerate icons with Pillow installed in apps/mobile/.expo/icon-tools."""
from pathlib import Path
import json
import sys

mobile = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(mobile / ".expo/icon-tools"))
from PIL import Image, ImageDraw, ImageFont

theme = json.loads((mobile / "src/theme.ts").read_text().split("export const theme = ")[1].split(" as const;")[0])
colors = theme["colors"]
font_path = mobile.parents[1] / "node_modules/@expo-google-fonts/schibsted-grotesk/700Bold/SchibstedGrotesk_700Bold.ttf"
font = ImageFont.truetype(str(font_path), 640)
assets = mobile / "assets/icons"
assets.mkdir(parents=True, exist_ok=True)

for name, background, ink in [("foreground", None, colors["ink"]), ("monochrome", None, colors["ink"]), ("icon", colors["bg"], colors["ink"])]:
    image = Image.new("RGBA", (1024, 1024), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    box = draw.textbbox((0, 0), "k", font=font)
    draw.text(((1024 - box[2] + box[0]) / 2 - box[0], (1024 - box[3] + box[1]) / 2 - box[1]), "k", font=font, fill=ink)
    image.save(assets / f"{name}.png")

image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.line((512, 300, 512, 724), fill=colors["ink"], width=52)
draw.line((300, 512, 724, 512), fill=colors["ink"], width=52)
image.save(assets / "shortcut-add.png")
