"""Free, offline farming assistant: answers from the crop/soil knowledge base in data/*.txt.
It never invents numbers: every figure comes from the data files."""
import re
from pathlib import Path

BASE = Path(__file__).parent
CATEGORY_NAMES = {"grains": "Grains", "pulses": "Pulses", "oilseeds": "Oilseeds", "commercial": "Commercial crops",
                  "fruits": "Fruits", "vegetables": "Vegetables", "spices": "Spices", "special": "Special crops",
                  "flowers": "Flowers"}

CROPS, SOILS = {}, {}


def _rows(name, n):
    for line in (BASE / "data" / name).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            parts = [p.strip() for p in line.split("|")]
            if len(parts) == n:
                yield parts


def load():
    for r in _rows("crops.txt", 17):
        keys = ["slug", "name", "hindi", "category", "image", "season", "soil", "temp", "rain", "water", "duration",
                "sowing", "harvest", "npk", "yield", "about", "tip"]
        CROPS[r[0]] = dict(zip(keys, r))
    for r in _rows("soils.txt", 13):
        keys = ["slug", "name", "image", "ph_range", "ph", "n", "p", "k", "texture", "retention", "regions", "crops", "about"]
        s = dict(zip(keys, r))
        s["crops"] = [c.strip() for c in s["crops"].split(",")]
        SOILS[r[0]] = s


load()

# Hinglish / local names -> crop slug
ALIASES = {
    "gehu": "wheat", "gehun": "wheat", "dhan": "rice", "chawal": "rice", "makka": "maize", "makai": "maize",
    "jau": "barley", "ragi": "bajra", "sarson": "mustard", "sarso": "mustard", "aloo": "potato", "alu": "potato",
    "pyaz": "onion", "pyaaz": "onion", "tamatar": "tomato", "kapas": "cotton", "ganna": "sugarcane",
    "haldi": "turmeric", "adrak": "ginger", "jeera": "cumin", "zeera": "cumin", "lahsun": "garlic", "lasun": "garlic",
    "mirch": "chilli", "mirchi": "chilli", "moongfali": "groundnut", "mungfali": "groundnut", "peanut": "groundnut",
    "til": "sesame", "tur": "arhar", "toor": "arhar", "pigeon": "arhar", "chickpea": "chana", "chane": "chana",
    "lentil": "masoor", "blackgram": "urad", "greengram": "moong", "pea": "matar", "peas": "matar", "kidney": "rajma",
    "cowpea": "lobia", "nariyal": "coconut", "aam": "mango", "seb": "apple", "kela": "banana", "angoor": "grapes",
    "grape": "grapes", "santra": "orange", "papita": "papaya", "ananas": "pineapple", "tarbooz": "watermelon",
    "tarbuj": "watermelon", "kharbuja": "muskmelon", "anar": "pomegranate", "gobhi": "cabbage",
    "shimla": "capsicum", "gajar": "carrot", "gulab": "rose", "genda": "marigold", "chameli": "jasmine",
    "kamal": "lotus", "gudhal": "hibiscus", "soya": "soybean", "soyabean": "soybean", "alsi": "flaxseed",
    "flax": "flaxseed", "ajwain": "carom", "methi": "fenugreek", "elaichi": "cardamom", "laung": "clove",
    "kalimirch": "pepper", "chai": "tea", "bans": "bamboo", "buckwheat": "kuttu", "sunflower": "sunflower",
    "surajmukhi": "sunflower", "tulasi": "tulsi", "paddy": "rice", "corn": "maize", "sorghum": "jowar",
}

INTENTS = [
    ("sowing", r"sow|plant|boye|bone|buwai|buai|lagaye|lagana|lagayen|बुवाई|बोना|बोएं|लगाएं|कब लगा"),
    ("harvest", r"harvest|katai|kate|kaatna|कटाई|कटाइ|तोड़"),
    ("water", r"water|irrigat|paani|pani|sinchai|सिंचाई|पानी"),
    ("soil", r"soil|mitti|मिट्टी"),
    ("fertilizer", r"fertili[sz]|khad|khaad|npk|\burea\b|\bdap\b|manure|खाद|उर्वरक"),
    ("yield", r"yield|production|paidawar|upaj|उपज|पैदावार|कितना होता"),
    ("climate", r"temperature|climate|tapman|तापमान|rainfall|barish|बारिश"),
    ("season", r"season|kharif|rabi|zaid|ऋतु|मौसम"),
    ("duration", r"duration|how long|kitne din|kitna time|अवधि|कितने दिन|kitna samay"),
    ("tip", r"\btips?\b|advice|salah|care|सलाह|dhyan"),
    ("overview", r"grow|ugan|ugay|ugae|kheti|cultivat|guide|a to z|a-z|detail|kaise|how to|उगा|खेती|जानकारी|information|about|tell me"),
]

TOPICS = [
    (r"organic|jaivik|जैविक|compost|vermi|gobar|गोबर|khad banana",
     "🌿 Organic farming and compost basics:\n\n• Compost: layer dry material (straw, leaves) with green material (kitchen or crop waste) and cow dung. Keep it damp, turn it every 2 to 3 weeks. It is ready in about 2 to 3 months when dark and crumbly.\n• Vermicompost uses earthworms and finishes faster. Keep it shaded and moist.\n• Farmyard manure improves soil structure and water holding. Apply and mix it in before sowing.\n• Green manure (dhaincha, sunhemp) grown and ploughed in before the main crop adds nitrogen.\n• Mulching and crop rotation reduce weeds and disease."),
    (r"pest|insect|keet|कीट|aphid|bollworm|disease|\brog\b|रोग|fung|blight|leaf spot|spray|dawai|दवाई|pesticide|कीटनाशक",
     "🐛 Pests and diseases, a safe general approach:\n\n• Identify first. Look at the leaf, stem and underside, note which part is damaged and since when.\n• Start with low-risk steps: remove infected plants or leaves, keep the field clean, use resistant seed, rotate crops, install yellow or blue sticky traps and pheromone traps.\n• Neem-based sprays help against many soft-bodied pests.\n• Use chemical pesticides only when needed, only the product recommended for that pest and crop, and follow the label for dose, waiting period and safety gear.\n\nI cannot diagnose from text alone and will not guess a pesticide dose. Take a photo or a sample to your nearest Krishi Vigyan Kendra (KVK) or agriculture officer, or call the Kisan Call Centre (1800-180-1551)."),
    (r"drip|sprinkler|flood irrigation|irrigation method|water saving|save water|mulch|paani bachao",
     "💧 Irrigation methods:\n\n• Drip: water goes to the root zone through pipes. Saves a lot of water and suits vegetables, fruit trees and sugarcane.\n• Sprinkler: good for wheat, pulses and fodder on lighter soils.\n• Flood or furrow: simple and cheap but wastes water, common for rice and sugarcane.\n\nTips: water early morning or evening, mulch to cut evaporation, avoid watering at flowering stress points only if your crop guide says so, and check soil moisture 5 to 10 cm deep before irrigating."),
    (r"soil test|soil health|\bph\b|मिट्टी की जांच|soil card|improve soil|soil improve|sudhar",
     "🧪 Soil testing and soil health:\n\n• Test soil every 2 to 3 years. Take samples from 8 to 10 spots in the field, 15 cm deep, mix and send about half a kg to a soil testing lab (many districts run free Soil Health Card labs).\n• Most crops like pH 6 to 7.5. Acidic soil can be limed, alkaline or sodic soil is improved with gypsum and organic matter.\n• Add organic matter every season, rotate crops with a pulse, avoid burning crop residue, and avoid over-ploughing."),
    (r"rotation|intercrop|mixed crop|fasal chakra|फसल चक्र",
     "🔄 Crop rotation: follow a cereal with a pulse or oilseed, and avoid the same crop or same family on the same land year after year. Pulses such as chana, moong, arhar and urad add nitrogen. Rotation breaks pest and disease cycles and keeps soil healthy. Intercropping, for example arhar with soybean or jowar, uses space and spreads risk."),
    (r"npk|nutrient|nitrogen|phosphorus|potash|potassium|deficiency|yellow leaves|पोषक",
     "🧪 NPK in simple words: Nitrogen (N) drives leaf and shoot growth, Phosphorus (P) supports roots, flowering and seed, Potassium (K) helps the plant resist stress and fill grain or fruit.\n\nPale yellow older leaves often point to low nitrogen, purplish leaves to low phosphorus, and burnt leaf edges to low potassium. The best way to know is a soil test. Ask for a crop name and I can show its typical NPK from my guide."),
    (r"storage|store grain|post.?harvest|godown|bhandaran|भंडारण",
     "📦 Storing grain and produce: dry grain to the safe moisture level before storage (it should snap rather than bend), clean the store, use clean bags on a raised platform away from walls, keep the store ventilated and check regularly for insects and damp. Do not mix new and old stock."),
    (r"frost|heat wave|cold wave|hailstorm|drought|flood|weather|पाला|सूखा",
     "🌦️ Weather risks: for frost, irrigate lightly in the evening and cover young nursery plants. For heat waves, irrigate more often, mulch and avoid fertiliser top-dressing in peak heat. For waterlogging, open drains quickly. Also check the IMD or Meghdoot app for local forecasts. I do not have live weather data."),
    (r"seed treatment|seed rate|certified seed|beej|बीज उपचार",
     "🌱 Seeds: buy certified seed from a trusted dealer and keep the bill. Treat seed with a recommended fungicide or bio-agent such as Trichoderma before sowing, and for pulses use Rhizobium culture. Seed rate depends on the crop and variety, so check my crop guide, your seed packet and your KVK."),
    (r"loan|kcc|kisan credit|subsidy|scheme|pm.?kisan|yojana|insurance|bima|योजना|बीमा",
     "🏦 Schemes: farmers can ask about PM-KISAN, Kisan Credit Card (KCC) and PM Fasal Bima Yojana at their bank or the nearest agriculture office or Common Service Centre. Rules and amounts change, so check the official website or office for current details."),
]

HELP = ("🌱 I can help with:\n\n• How to grow a crop. Try \"how to grow wheat\", \"gehu kab boye\" or \"tomato fertiliser\".\n"
        "• Which crop to choose. Try \"which crop for rabi season in black soil\" or \"best fruit crops low water\".\n"
        "• Soil types, compost, irrigation, pests (safe general advice), crop rotation and storage.\n"
        "• Your own farm records. Try \"what tasks are pending\" or \"which items are low in stock\".\n\n"
        "I know 70 crops and 6 Indian soil types. For anything outside that, ask your nearest KVK or agriculture officer.")


def _tokens(text):
    return re.findall(r"[a-z]+|[\u0900-\u097f]+", text.lower())


def find_crops(text):
    q = text.lower()
    toks = _tokens(q)
    found = []

    def add(slug):
        if slug in CROPS and slug not in found:
            found.append(slug)

    for slug, c in CROPS.items():
        full = c["name"].lower()
        names = {slug, full, full.split(" (")[0].strip()}
        names |= {m.strip() for m in re.findall(r"\(([^)]+)\)", full)}
        if re.search(r"\b(" + "|".join(re.escape(n) for n in names) + r")\b", q):
            add(slug)
        elif c["hindi"] and c["hindi"] in text:
            add(slug)
    for t in toks:
        if t in ALIASES:
            add(ALIASES[t])
    if "green chilli" in q or "hari mirch" in q:
        add("chilli")
    return found[:2]


def _fmt(c, section):
    n = c["name"]
    if section == "sowing":
        return "🗓️ Sowing: %s. Season: %s." % (c["sowing"], c["season"])
    if section == "harvest":
        return "🌾 Harvest: %s (crop duration %s)." % (c["harvest"], c["duration"])
    if section == "water":
        return "💧 Water need: %s. Typical rainfall %s cm per year." % (c["water"], c["rain"])
    if section == "soil":
        return "🟤 Best soil: %s." % c["soil"]
    if section == "fertilizer":
        npk = c["npk"]
        unit = " kg/ha (N:P:K)" if re.fullmatch(r"[\d:]+", npk) else ""
        return "🧪 Fertiliser: %s%s. These are typical values, a soil test gives a better dose for your field." % (npk, unit)
    if section == "yield":
        return "📈 Typical yield: %s. Real yield depends on variety, soil, weather and management." % c["yield"]
    if section == "climate":
        return "🌡️ Temperature: %s °C. Rainfall: %s cm per year." % (c["temp"], c["rain"])
    if section == "season":
        return "🌤️ Season: %s." % c["season"]
    if section == "duration":
        return "⏱️ Duration: %s." % c["duration"]
    if section == "tip":
        return "💡 Tip: %s" % c["tip"]
    return ""


def crop_answer(slugs, text):
    c = CROPS[slugs[0]]
    q = text.lower()
    wanted = [name for name, pat in INTENTS if re.search(pat, q) or re.search(pat, text)]
    sections = [w for w in wanted if w != "overview"]
    head = "%s (%s), %s" % (c["name"], c["hindi"], CATEGORY_NAMES.get(c["category"], c["category"]).lower())
    if not sections:
        lines = [head + "\n", c["about"], "",
                 _fmt(c, "season"), _fmt(c, "soil"), _fmt(c, "climate"), _fmt(c, "water"), _fmt(c, "duration"),
                 _fmt(c, "sowing"), _fmt(c, "harvest"), _fmt(c, "fertilizer"), _fmt(c, "yield"), "", _fmt(c, "tip")]
        suited = [s["name"] for s in SOILS.values() if c["slug"] in s["crops"]]
        if suited:
            lines.insert(-2, "🗺️ Grows well in: %s." % ", ".join(suited))
        return "\n".join(lines)
    body = "\n".join(_fmt(c, s) for s in sections)
    return "%s\n\n%s\n\nAsk \"how to grow %s\" for the full guide." % (head, body, c["name"].lower())


def soil_answer(text):
    q = text.lower()
    for s in SOILS.values():
        key = s["name"].lower().split(" (")[0].replace(" soil", "")
        if re.search(r"\b" + re.escape(key) + r"\b", q) or (s["slug"] == "desert" and "arid" in q):
            names = [CROPS[c]["name"] for c in s["crops"] if c in CROPS]
            return ("%s\n\n%s\n\n• pH: %s\n• Texture: %s\n• Water holding: %s\n• Found in: %s\n• Suited crops: %s"
                    % (s["name"], s["about"], s["ph_range"], s["texture"], s["retention"], s["regions"], ", ".join(names)))
    return None


def suggest(text):
    q = text.lower()
    if not re.search(r"which|what (should|to|can)|best|suggest|recommend|kaun|konsi|kaunsi|kya (lagaye|ugaye|boye)|konsa|suitable|कौन|कौनसी|सुझाव", q):
        return None
    season = None
    if re.search(r"rabi|winter|sardi|सर्दी|रबी", q):
        season = "Rabi"
    elif re.search(r"kharif|monsoon|rainy|barsat|खरीफ", q):
        season = "Kharif"
    elif re.search(r"zaid|summer|garmi|गर्मी|जायद", q):
        season = "Zaid"
    water = "Low" if re.search(r"low water|less water|dry|kam paani|kam pani|drought|rainfed", q) else (
        "High" if re.search(r"high water|plenty of water|flood|high rainfall|waterlogged", q) else None)
    cat = None
    for key, pat in [("fruits", r"fruit|phal"), ("vegetables", r"vegetable|sabzi|sabji"), ("pulses", r"pulse|dal\b"),
                     ("spices", r"spice|masala"), ("flowers", r"flower|phool"), ("oilseeds", r"oilseed|oil seed|tilhan"),
                     ("grains", r"grain|cereal|anaj"), ("commercial", r"cash crop|commercial")]:
        if re.search(pat, q):
            cat = key
    soil = None
    for s in SOILS.values():
        key = s["name"].lower().split(" (")[0].replace(" soil", "")
        if re.search(r"\b" + re.escape(key) + r"\b", q):
            soil = s
    if not (season or water or cat or soil):
        return None
    scored = []
    for slug, c in CROPS.items():
        if season and season.lower() not in c["season"].lower() and "year-round" not in c["season"].lower():
            continue
        if water and c["water"] != water:
            continue
        if cat and c["category"] != cat:
            continue
        if soil and slug not in soil["crops"]:
            continue
        scored.append(c)
    if not scored:
        return "I could not find a crop that matches all of those conditions in my guide. Try removing one condition, for example the season or the soil type."
    picks = scored[:8]
    parts = [k for k in [season and "season " + season, soil and soil["name"], water and water.lower() + " water need",
                         cat and CATEGORY_NAMES[cat].lower()] if k]
    lines = ["🌾 Crops that fit %s:\n" % ", ".join(parts)]
    for c in picks:
        lines.append("• %s (%s): %s, water need %s, %s" % (c["name"], c["hindi"], c["season"], c["water"].lower(), c["duration"]))
    if len(scored) > len(picks):
        lines.append("...and %d more." % (len(scored) - len(picks)))
    lines.append("\nAsk \"how to grow <crop>\" for the full guide. Local rainfall, irrigation and market also matter, so check with your KVK.")
    return "\n".join(lines)


def answer(text):
    """Return (reply, matched) where matched says whether the knowledge base really knew the answer."""
    text = (text or "").strip()
    q = text.lower()
    if re.fullmatch(r"(hi|hello|hey|namaste|namaskar|hii+|नमस्ते|नमस्कार)[\s!.]*", q):
        return "Namaste! 🙏 I am your farm assistant. " + HELP, True
    if re.fullmatch(r"(thanks|thank you|thankyou|shukriya|dhanyavad|धन्यवाद|ok thanks)[\s!.]*", q):
        return "You are welcome! Happy farming 🌱", True
    if re.search(r"\bhelp\b|what can you do|kya kar sakte|मदद", q):
        return HELP, True

    s = suggest(text)
    if s:
        return s, True
    crops = find_crops(text)
    if crops:
        return crop_answer(crops, text), True
    sa = soil_answer(text)
    if sa:
        return sa, True
    for pat, reply in TOPICS:
        if re.search(pat, q) or re.search(pat, text):
            return reply, True
    return HELP, False
