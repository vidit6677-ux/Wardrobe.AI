from fastapi import FastAPI
from pydantic import BaseModel
import torch
import clip
import requests
from PIL import Image
from io import BytesIO
import numpy as np
from sklearn.cluster import KMeans
import math

app = FastAPI()

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

CLOTHING_LABELS = [
    "t-shirt","shirt","jeans","trousers","jacket","hoodie","sweater",
    "coat","shorts","skirt","dress","sneakers","formal shoes",
    "sandals","boots","watch","bag","backpack"
]

FASHION_COLORS = {
    "black": (0,0,0), "white": (255,255,255), "gray": (128,128,128),
    "light gray": (200,200,200), "charcoal": (54,69,79),
    "red": (220,20,60), "maroon": (128,0,0), "burgundy": (128,0,32),
    "pink": (255,105,180), "rose": (255,192,203),
    "orange": (255,140,0), "peach": (255,218,185), "coral": (255,127,80),
    "yellow": (255,215,0), "mustard": (204,173,0),
    "green": (0,128,0), "olive": (128,128,0), "mint": (152,255,152),
    "emerald": (80,200,120),
    "blue": (0,0,255), "navy": (0,0,128), "sky blue": (135,206,235),
    "teal": (0,128,128), "turquoise": (64,224,208),
    "purple": (128,0,128), "lavender": (230,230,250), "violet": (238,130,238),
    "brown": (139,69,19), "beige": (245,245,220), "tan": (210,180,140),
    "camel": (193,154,107),
    "silver": (192,192,192), "gold": (255,215,0)
}

class ImageRequest(BaseModel):
    image_url: str

@app.get("/health")
def health():
    return {"status": "Vision AI running with CLIP"}

def download_image(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return Image.open(BytesIO(r.content)).convert("RGB")

def get_image_embedding(image_url: str):
    image = download_image(image_url)
    image_input = preprocess(image).unsqueeze(0).to(device)

    with torch.no_grad():
        embedding = model.encode_image(image_input)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)

    return embedding.cpu().numpy()[0]

@app.post("/analyze")
def analyze_image(data: ImageRequest):
    image = download_image(data.image_url)

    embedding = get_image_embedding(data.image_url)
    image_tensor = torch.tensor(embedding).unsqueeze(0).to(device)

    clothing_type = classify_clothing(image_tensor)
    dominant_colors = extract_dominant_color(image)

    color_names = []
    for c in dominant_colors:
        if not (c[0] > 240 and c[1] > 240 and c[2] > 240):
            color_names.append(closest_color_name(c))

    color_names = list(set(color_names))

    return {
        "category": {
            "main": (
                "top" if clothing_type in ["t-shirt", "shirt", "hoodie", "sweater"] else
                "bottom" if clothing_type in ["jeans", "trousers", "shorts", "skirt"] else
                "footwear" if clothing_type in ["sneakers", "formal shoes", "sandals", "boots"] else
                "outerwear" if clothing_type in ["jacket", "coat"] else
                "accessory"
            ),
            "sub": clothing_type
        },
        "color": color_names,
        "style": ["casual"],
        "season": ["all"],
        "embedding": embedding.tolist()
    }

def classify_clothing(image_embedding):
    text_prompts = [f"a photo of {label}" for label in CLOTHING_LABELS]
    text_tokens = clip.tokenize(text_prompts).to(device)

    with torch.no_grad():
        text_features = model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    similarities = (image_embedding @ text_features.T).squeeze(0)
    best_index = similarities.argmax().item()
    return CLOTHING_LABELS[best_index]

def extract_dominant_color(image):
    image = image.resize((100, 100))
    pixels = np.array(image).reshape(-1, 3)
    kmeans = KMeans(n_clusters=3, random_state=42)
    kmeans.fit(pixels)
    return kmeans.cluster_centers_.astype(int)

def rgb_to_lab(rgb):
    r, g, b = [x / 255.0 for x in rgb]

    def inv(c):
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    r, g, b = inv(r), inv(g), inv(b)

    X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041

    Xn, Yn, Zn = 0.95047, 1.0, 1.08883

    def f(t):
        d = 6/29
        return t**(1/3) if t > d**3 else t/(3*d*d) + 4/29

    fx, fy, fz = f(X/Xn), f(Y/Yn), f(Z/Zn)

    L = 116*fy - 16
    a = 500*(fx - fy)
    b = 200*(fy - fz)
    return (L,a,b)

_palette_lab_cache = {k: rgb_to_lab(v) for k,v in FASHION_COLORS.items()}

def delta_e(lab1, lab2):
    return math.sqrt(sum((a-b)**2 for a,b in zip(lab1, lab2)))

def closest_color_name(rgb):
    r,g,b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    lum = 0.2126*r + 0.7152*g + 0.0722*b
    chroma = max(r,g,b) - min(r,g,b)

    if lum > 245 and chroma < 10: return "white"
    if lum < 20 and chroma < 20: return "black"
    if chroma < 20:
        if lum < 70: return "charcoal"
        if lum < 140: return "gray"
        return "light gray"

    lab = rgb_to_lab((r,g,b))
    best, dist = None, float("inf")

    for name, pal_lab in _palette_lab_cache.items():
        d = delta_e(lab, pal_lab)
        if d < dist:
            dist, best = d, name

    return best
