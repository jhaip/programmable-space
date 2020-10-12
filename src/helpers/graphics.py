import json

class Illumination:
    def __init__(self):
        self.illuminations = []

    def add(self, typ, opts):
        self.illuminations.append({"type": typ, "options": opts})

    def addColorType(self, typ, opts):
        if len(opts) == 1:
            opts = opts[0]
        self.add(typ, opts)

    def rect(self, x, y, w, h):
        self.add("rectangle", {"x": x, "y": y, "w": w, "h": h})

    def ellipse(self, x, y, w, h):
        self.add("ellipse", {"x": x, "y": y, "w": w, "h": h})

    def text(self, x, y, txt):
        self.add("text", {"x": x, "y": y, "text": txt})

    def line(self, x1, y1, x2, y2):
        self.add("line", [x1, y1, x2, y2])

    # point format: [[x1, y1], [x2, y2], ...]
    def polygon(self, points):
        self.add("polygon", points)
    
    def image(self, x, y, w, h, base64image):
        self.add("image", {"x": x, "y": y, "w": w, "h": h, "bitmap_image_base64": base64image})

    #  color format: string, [r, g, b], or [r, g, b, a]
    def fill(self, *args):
        self.addColorType("fill", args)

    def stroke(self, *args):
        self.addColorType("stroke", args)

    def nostroke(self, ):
        self.add("nostroke", [])

    def nofill(self, ):
        self.add("nofill", [])

    def strokewidth(self, width):
        self.add("strokewidth", width)

    def fontsize(self, width):
        self.add("fontsize", width)

    def fontcolor(self, *args):
        self.addColorType("fontcolor", args)

    def push(self, ):
        self.add("push", [])

    def pop(self, ):
        self.add("pop", [])

    def translate(self, x, y):
        self.add("translate", {"x": x, "y": y})

    def rotate(self, radians):
        self.add("rotate", radians)

    def scale(self, x, y):
        self.add("scale", {"x": x, "y": y})
    
    def set_transform(self, m11, m12, m13, m21, m22, m23, m31, m32, m33):
        self.add("transform", [m11, m12, m13, m21, m22, m23, m31, m32, m33])

    def to_string(self):
        return json.dumps(self.illuminations)
    
    def to_batch_claim(self, MY_ID_STR, subscriptionId, target=None):
        target_token = None
        if target == "global":
            target_token = ["text", "global"]
        elif target is None:
            target_token = ["integer", str(int(MY_ID_STR))]
        else:
            target_token = ["integer", str(int(target))]
        return {"type": "claim", "fact": [
            ["id", MY_ID_STR],
            ["id", str(subscriptionId)],
            ["text", "draw"],
            ["text", "graphics"],
            ["text", self.to_string()],
            ["text", "on"],
            target_token,
        ]}
