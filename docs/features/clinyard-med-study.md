# ClinYard — ClinFusion-style med study (offline)

**Status:** Implemented (Yard-safe, frontend-only)  
**Route:** `/clinyard`  
**Audience:** Pre-med / med / nursing professional students (Meharry Focus path primary discovery)

## What it is

ClinYard is BlkSpace’s **distilled student surface** for skill classes evaluated by [ClinFusion](https://github.com/alibaba-damo-academy/ClinFusion) (Alibaba DAMO Academy): clinical MCQ, 2D image VQA literacy, instruction-following, report structure, task/organ tags, and a static workflow walkthrough.

It does **not** run ClinFusion-8B/32B, vLLM, Flash-Attention, multi-encoder vision stacks, or NIfTI 3D volumes inside Yard.

## Feature map

| ClinFusion capability | ClinYard |
|----------------------|----------|
| Text clinical MCQ | Mode `mcq` + seed pack |
| 2D image VQA | Mode `image_vqa` + teaching SVGs |
| Instruction following | Mode `instruction` checklist |
| Report generation | Mode `report` + self rubric |
| Task / organ / hardness tags | Filter chips (`lib/clinyard/tasks.ts`) |
| JSONL-like message shape | `prompt` / optional `imageAsset` on items |
| Agentic tools | Workflow lite (static cards only) |
| Full model / 3D / RoI metrics | See `clinyard-clinfusion-lab.md` |

## UI entry

- **More** menu → ClinYard  
- **Focus Path** (`/focus`) entry card  
- Focus journey step “ClinYard drills”  
- Hub med seed item (copy points to `/clinyard`)

## Safety

- `NO_PHI_POLICY` banner on page  
- Education-only copy  
- Explicit “no ClinFusion weights in Yard”  
- Original vignette content (not bulk eval dataset dump)

## Code

- `Code-Companion/artifacts/blkspace/src/lib/clinyard/*`
- `Code-Companion/artifacts/blkspace/src/pages/clinyard.tsx`
- `public/images/clinyard/*.svg`
- Tests: `src/test/clinyard.test.ts`

## Yard cold-start note (2026-08)

ClinYard stays **route-lazy** (`React.lazy` in `App.tsx`) so it is **not** on the Tier 0 shell path. Cold-start gates live in `tier0_benchmark` (process shell ready + `/feed` interactive &lt;3s) — open `/feed` first for Device B A4, not ClinYard. Full ClinFusion weights remain lab-only (`clinyard-clinfusion-lab.md`).

## Attribution

Formats and skill taxonomy subset inspired by ClinFusion (Apache-2.0). Paper: https://arxiv.org/abs/2607.24743  
Original study items © BlkSpace.
