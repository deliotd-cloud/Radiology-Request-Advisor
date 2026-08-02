# Radiology Request Advisor

Decision support to help referring clinicians choose the right radiology investigation, based on the
clinical indication, patient age, urgency and renal function.

A single self-contained HTML file. No build step, no dependencies, no install. Open it in any modern
browser and it works offline.

> ## ⚠️ Not a medical device
>
> This tool is **not clinically validated, not regulated, and not a substitute for clinical judgement.**
> Suggestions are indicative only and are based on published referral-guideline *principles*
> (RCR iRefer, NICE, ACR Appropriateness Criteria, RCR/ESUR contrast guidance).
>
> It has no access to the patient record, cannot examine the patient, and does not replace vetting by a
> radiologist. **Always follow local protocols** and discuss complex or urgent cases with the duty
> radiologist. Radiation doses are population averages. Renal thresholds reflect current consensus, but
> local policy takes precedence.
>
> Use at your own risk. No warranty of fitness for clinical use is given or implied.

---

## Using it

Download `index.html` and open it, or clone the repository:

```bash
git clone https://github.com/deliotd-cloud/Radiology-Request-Advisor.git
```

Then double-click `index.html`.

**Patient data never leaves the device.** There is no server, no analytics and no network request of any
kind — the file makes no external calls. Everything runs in the browser.

## What it does

**Input** — free-text clinical indication, age, sex, weight, requested urgency, renal function
(eGFR directly, or creatinine with automatic CKD-EPI 2021 calculation), plus flags for pregnancy,
dialysis, AKI, metformin, contrast allergy, MRI implants and more.

**Output** — a recommended study with its rationale, alternatives and when to prefer them, add-on
studies, key clinical points, guideline reference, and a copy-to-clipboard draft request text.

### Modality selection

Around 50 scenarios spanning neuro, spine, chest, cardiac, vascular, abdominal, urological,
gynaecological, MSK, oncological, trauma and paediatric imaging. Where several scenarios match, the
alternatives appear as clickable chips so you can pin the one you meant.

### Renal function

Thresholds follow current RCR / ESUR / ACR consensus rather than older, more restrictive teaching:

| Agent | Guidance |
|---|---|
| **Iodinated contrast** | eGFR ≥ 45: no precautions. 30–44: hydrate, minimise volume. < 30: discuss first, prefer a non-contrast alternative, volume-expansion protocol given. |
| **Dialysis** | Give contrast if needed; no urgent extra session, no need to time the scan around dialysis. |
| **AKI** | Treated as high risk regardless of the quoted eGFR — the equation is invalid when creatinine is not in steady state. |
| **Metformin** | Withheld only below eGFR 30 or in AKI. |
| **Gadolinium** | ≥ 30: negligible NSF risk with group II macrocyclics. < 30: documented risk–benefit; group I linear agents contraindicated. |

Time-critical indications (aortic dissection, mesenteric ischaemia, major trauma) explicitly override
the renal caution — post-contrast AKI is treatable, a missed diagnosis is not.

### Safety overlay

Urgency-mismatch warnings in both directions, pregnancy and fetal dose, confirm-LMP prompts,
paediatric dose escalation, MRI implant and claustrophobia flags, thyrotoxicosis, and effective dose
expressed as background-radiation equivalent.

## How the text matching works

The indication is normalised, then screened for negation, then matched against a weighted keyword rule
base. Everything the tool inferred is shown back to you, so a misparse is visible rather than silent.

**1. Normalisation** — abbreviation expansion (`SOB`, `LOC`, `#NOF`, `h/o`), known UK/US spelling
variants (`hemoptysis` → `haemoptysis`), then Damerau–Levenshtein typo correction against the clinical
vocabulary. Guards against false corrections: nothing under 5 characters, one edit up to 9 characters
and two beyond, first letter must match for two-edit corrections, and **no correction at all when two
terms tie**. Corrected terms score at 85% weight so a guess cannot outrank an exact match.

**2. Negation** — NegEx-style, with forward scope (`no chest pain`) and backward scope (`PE ruled out`),
ending at the clause boundary or ~7 words. A protected phrase list keeps requests-to-investigate intact:
`rule out`, `to exclude`, `?PE` and `cannot exclude` all survive. The cue list is deliberately
conservative — failing to spot a negation merely over-suggests a scan, which vetting catches, whereas a
false negation could suppress one that was needed.

**3. Historical context** — terms following `known`, `history of`, `previously` count at reduced weight,
so "headache … known breast cancer" reads as a headache referral with a cancer history rather than a
breast referral.

### Known limitations

Keyword matching cannot understand nuance, temporality or unusual presentations, and negation detection
is a heuristic rather than genuine comprehension. A typo in a term the rule base does not know will fall
through to "more detail needed" rather than guess wrong — the safe failure. Complex or nested clauses
are not followed reliably.

## Usage log

Pressing **Recommend imaging** increments a counter held in the browser's local storage, shown in the
header. Click it for statistics, CSV export, or to delete the log.

**No patient data is recorded** — each entry holds only a timestamp, the matched scenario, the requested
urgency and the contrast type. Never the indication text, the age or the renal values. Nothing is
transmitted. The log is local to one browser profile on one device and does **not** aggregate across
users or machines.

## Editing the rule base

Rules live in the `RULES` array near the top of the `<script>` block, in a readable format:

```js
{
  id:'pe', cat:'Chest', label:'Suspected pulmonary embolism',
  kw:[[/pulmonary embol/i, 9], [/pleuritic.{0,20}(pain|chest)/i, 5]],
  urg:2,
  primary:{study:'CT pulmonary angiogram (CTPA)', contrast:'iodinated', dose:4, why:'...'},
  alts:[{s:'V/Q SPECT', w:'Pregnancy, severe contrast allergy...'}],
  pearls:['Apply the Wells score first...'],
  ref:'NICE NG158; BTS'
}
```

`kw` pairs a regex with a weight; the highest-scoring rule wins. `urg` is 0–3
(routine → emergency) and drives the urgency-mismatch warning. `dose` is the effective dose in mSv.

**Review the rule base against your own local protocols before anyone uses it in earnest.**

## Self-test

A regression suite of 46 cases is built into the file, covering core matching, negation,
pseudo-negation, historical context, typos, US spellings, abbreviations and false-correction guards.

Run it with the **Run self-test** button in the footer, or `runSelfTest()` in the browser console.
Do this after editing the rule base.
