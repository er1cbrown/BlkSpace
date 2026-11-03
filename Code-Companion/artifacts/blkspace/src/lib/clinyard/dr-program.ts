/**
 * ClinYard DR screening program.
 * The page is the front end. Training and scoring run on a GPU host
 * (Google Colab or an xAI box). Hostinger only serves the site.
 * The picture is posted to the URL the student pastes, then dropped.
 */
import {
  getNotebook,
  saveNotebook,
  type HomeworkNotebook,
} from "@/lib/homework-notebook";

export const DR_NOTEBOOK_ID = "nb_dr_screen";
/** Local percent script. LazyVim Space pc runs jupytext --to ipynb beside it. */
export const DR_PY_NAME = "dr-screening.py";
export const DR_HOMEWORK_HREF = "/ide?program=dr";

export const DR_GRADES = [
  {
    classIndex: 0,
    label: "No DR",
    detail: "No clear diabetic lesions on the teaching scale.",
  },
  {
    classIndex: 1,
    label: "Mild",
    detail: "Microaneurysms only, on the APTOS 0–4 scale.",
  },
  {
    classIndex: 2,
    label: "Moderate",
    detail: "More than microaneurysms, short of the severe grade.",
  },
  {
    classIndex: 3,
    label: "Severe",
    detail: "Severe non-proliferative grade on that scale.",
  },
  {
    classIndex: 4,
    label: "Proliferative",
    detail: "Proliferative grade on that scale.",
  },
] as const;

export type DrHostId = "colab" | "xai";

export const DR_HOSTS: { id: DrHostId; label: string; placeholder: string }[] =
  [
    {
      id: "colab",
      label: "Google Colab",
      placeholder: "https://your-colab-tunnel.example",
    },
    {
      id: "xai",
      label: "xAI GPU",
      placeholder: "https://your-xai-gpu-host.example",
    },
  ];

export interface DrScore {
  classIndex: number;
  confidence: number;
  label: string;
}

const BLOCKED_SUFFIXES = ["bkspc.app", "hostinger.com", "hostingersite.com"];

export function drPredictUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Paste the https URL of the GPU host." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "The GPU host URL has to start with https." };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      reason: "Put a token in the token field, not in the URL.",
    };
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  ) {
    return {
      ok: false,
      reason: "Use the public https URL of the Colab or xAI host.",
    };
  }
  if (host === "api.x.ai") {
    return {
      ok: false,
      reason:
        "Paste the GPU server that runs this notebook, not the xAI chat API.",
    };
  }
  if (
    BLOCKED_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
  ) {
    return {
      ok: false,
      reason:
        "That host is the website. Scoring stays on Colab or the xAI GPU.",
    };
  }
  const path = url.pathname.replace(/\/$/, "");
  url.pathname = path.endsWith("/predict") ? path : `${path}/predict`;
  url.hash = "";
  return { ok: true, url: url.toString() };
}

export function parseDrResponse(body: unknown): DrScore | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  const classIndex = Number(row.classIndex ?? row.class_index);
  const confidence = Number(row.confidence);
  if (!Number.isInteger(classIndex) || classIndex < 0 || classIndex > 4) {
    return null;
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return null;
  }
  const named = DR_GRADES[classIndex].label;
  const label =
    typeof row.label === "string" && row.label.trim()
      ? row.label.trim()
      : named;
  return { classIndex, confidence, label };
}

export async function requestDrScore(
  endpoint: string,
  file: Blob,
  token?: string,
): Promise<DrScore> {
  const checked = drPredictUrl(endpoint);
  if (!checked.ok) throw new Error(checked.reason);
  const body = new FormData();
  body.append("image", file);
  const headers: Record<string, string> = {};
  const trimmed = token?.trim();
  if (trimmed) headers.Authorization = `Bearer ${trimmed}`;
  const res = await fetch(checked.url, {
    method: "POST",
    body,
    headers,
    credentials: "omit",
    mode: "cors",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`The GPU host returned ${res.status}.`);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("The GPU host did not return JSON.");
  }
  const score = parseDrResponse(json);
  if (!score) {
    throw new Error(
      "The host JSON needs classIndex 0–4 and confidence from 0 to 1.",
    );
  }
  return score;
}

function cell(id: string, lang: "python" | "markdown", source: string) {
  return { id, lang, source };
}

/** Seed cells. Each source stays under the homework editor cap. */
export function drProgramNotebook(): HomeworkNotebook {
  return {
    id: DR_NOTEBOOK_ID,
    title: "DR screening",
    updatedAt: "2026-11-02T00:00:00.000Z",
    cells: [
      cell(
        "dr_note",
        "markdown",
        [
          "# DR screening program",
          "",
          "Educational transfer-learning exercise on the public APTOS 2019 fundus set (grades 0–4).",
          "This is not a medical device and it does not diagnose anyone.",
          "",
          "Hostinger serves the ClinYard page only. It does not have the GPU for this model.",
          "Open in LazyVim writes this notebook as a local percent .py named dr-screening.py.",
          "Space pc in that LazyVim config runs jupytext --to ipynb and writes dr-screening.ipynb beside it.",
          "jupytext.nvim then opens the .ipynb as markdown. Space mp starts the miniconda kernel. Space rc runs a cell.",
          "",
          "ClinYard posts the picture only to the https URL you paste, then drops it.",
          "Do not use a real patient photo. Do not point the URL at bkspc.app.",
        ].join("\n"),
      ),
      cell(
        "dr_gpu",
        "python",
        [
          "# Local notebook on the miniconda kernel. Not on Hostinger.",
          "# A GPU still has to be this machine, or the xAI GPU host, before torch.cuda is true.",
          "import torch",
          'print("cuda", torch.cuda.is_available())',
          "if torch.cuda.is_available():",
          "    print(torch.cuda.get_device_name(0))",
        ].join("\n"),
      ),
      cell(
        "dr_data",
        "python",
        [
          "# APTOS 2019: train.csv plus train_images/<id_code>.png",
          "# Default path is /content/aptos. Locally, or on the xAI box, set APTOS_ROOT.",
          "import os",
          "from pathlib import Path",
          "import pandas as pd",
          'ROOT = Path(os.environ.get("APTOS_ROOT", "/content/aptos"))',
          'df = pd.read_csv(ROOT / "train.csv")',
          'df["path"] = df["id_code"].map(lambda i: str(ROOT / "train_images" / f"{i}.png"))',
          'print(df["diagnosis"].value_counts().sort_index())',
          'print("rows", len(df))',
        ].join("\n"),
      ),
      cell(
        "dr_train",
        "python",
        [
          "# ImageNet EfficientNet-B0, five grades. Internal holdout only.",
          "import timm",
          "import torch",
          "import torchvision.transforms as T",
          "from PIL import Image",
          "from sklearn.model_selection import train_test_split",
          "from torch.utils.data import DataLoader, Dataset",
          "",
          'LABELS = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]',
          "train_df, hold_df = train_test_split(",
          '    df, test_size=0.2, random_state=7, stratify=df["diagnosis"]',
          ")",
          "",
          "class FundusSet(Dataset):",
          "    def __init__(self, frame):",
          "        self.frame = frame.reset_index(drop=True)",
          "        self.tf = T.Compose([",
          "            T.Resize((224, 224)),",
          "            T.ToTensor(),",
          "            T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),",
          "        ])",
          "    def __len__(self):",
          "        return len(self.frame)",
          "    def __getitem__(self, i):",
          "        row = self.frame.iloc[i]",
          '        img = Image.open(row["path"]).convert("RGB")',
          '        return self.tf(img), int(row["diagnosis"])',
          "",
          'device = "cuda" if torch.cuda.is_available() else "cpu"',
          'model = timm.create_model("efficientnet_b0", pretrained=True, num_classes=5).to(device)',
          "opt = torch.optim.Adam(model.parameters(), lr=1e-4)",
          "loss_fn = torch.nn.CrossEntropyLoss()",
          "loader = DataLoader(FundusSet(train_df), batch_size=16, shuffle=True)",
          "model.train()",
          "for epoch in range(2):",
          "    total = 0.0",
          "    for x, y in loader:",
          "        x, y = x.to(device), y.to(device)",
          "        opt.zero_grad()",
          "        loss = loss_fn(model(x), y)",
          "        loss.backward()",
          "        opt.step()",
          "        total += float(loss)",
          '    print("epoch", epoch, "loss", round(total / max(len(loader), 1), 4))',
        ].join("\n"),
      ),
      cell(
        "dr_holdout",
        "python",
        [
          "# Internal accuracy on the holdout split. Not a clinical clearance number.",
          "model.eval()",
          "hold = DataLoader(FundusSet(hold_df), batch_size=16)",
          "correct = 0",
          "seen = 0",
          "with torch.no_grad():",
          "    for x, y in hold:",
          "        x, y = x.to(device), y.to(device)",
          "        pred = model(x).argmax(dim=1)",
          "        correct += int((pred == y).sum())",
          "        seen += int(y.numel())",
          'print("internal accuracy", round(correct / max(seen, 1), 4), "n", seen)',
          'torch.save({"state": model.state_dict(), "labels": LABELS}, "dr-efficientnet-b0.pt")',
        ].join("\n"),
      ),
      cell(
        "dr_serve",
        "python",
        [
          '# POST /predict with multipart field "image".',
          '# Returns {"classIndex", "confidence", "label"}.',
          "# After Space pc, this cell lives in the local .ipynb.",
          "# Serve /predict on the GPU machine, then paste that https origin into ClinYard.",
          "# app.run stays commented so this cell does not block when you only define the route.",
          "from io import BytesIO",
          "from flask import Flask, request, jsonify",
          "",
          "app = Flask(__name__)",
          "model.eval()",
          "prep = T.Compose([",
          "    T.Resize((224, 224)),",
          "    T.ToTensor(),",
          "    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),",
          "])",
          "",
          "def score_png(raw):",
          '    img = Image.open(BytesIO(raw)).convert("RGB")',
          "    batch = prep(img).unsqueeze(0).to(device)",
          "    with torch.no_grad():",
          "        probs = torch.softmax(model(batch), dim=1)[0]",
          "    index = int(probs.argmax())",
          "    return {",
          '        "classIndex": index,',
          '        "confidence": float(probs[index]),',
          '        "label": LABELS[index],',
          "    }",
          "",
          "@app.after_request",
          "def add_cors(resp):",
          '    origin = request.headers.get("Origin", "*")',
          '    resp.headers["Access-Control-Allow-Origin"] = origin',
          '    resp.headers["Vary"] = "Origin"',
          '    resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"',
          '    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"',
          "    return resp",
          "",
          '@app.route("/predict", methods=["OPTIONS"])',
          "def predict_options():",
          '    return ("", 204)',
          "",
          '@app.post("/predict")',
          "def predict():",
          '    blob = request.files.get("image")',
          "    if blob is None:",
          '        return jsonify(error="missing image"), 400',
          "    return jsonify(score_png(blob.read()))",
          "",
          '# app.run(host="0.0.0.0", port=7860)',
          'print("Define done. Uncomment app.run on the GPU host. ClinYard posts to https://<host>/predict")',
        ].join("\n"),
      ),
    ],
  };
}

export function ensureDrProgramNotebook(): HomeworkNotebook {
  const existing = getNotebook(DR_NOTEBOOK_ID);
  if (existing) return existing;
  return saveNotebook(drProgramNotebook());
}

/**
 * Jupytext percent script. The LazyVim keymap Space pc runs
 * `jupytext --to ipynb` on this file (miniconda jupytext).
 * Kernel name `miniconda` matches MoltenInit in lua/plugins/jupyter.lua.
 */
export function toPercentPy(notebook: HomeworkNotebook): string {
  const header = [
    "# ---",
    "# jupyter:",
    "#   kernelspec:",
    "#     display_name: Miniconda",
    "#     language: python",
    "#     name: miniconda",
    "# ---",
  ].join("\n");
  const cells = notebook.cells.map((item) => {
    const body = item.source.replace(/\s+$/, "");
    if (item.lang === "python") {
      return `# %%\n${body}`;
    }
    const lines = body
      .split("\n")
      .map((line) => (line.length ? `# ${line}` : "#"));
    return ["# %% [markdown]", ...lines].join("\n");
  });
  return `${header}\n\n${cells.join("\n\n")}\n`;
}
