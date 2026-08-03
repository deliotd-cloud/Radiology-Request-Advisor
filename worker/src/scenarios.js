/**
 * Scenario allowlist, generated from the RULES array in index.html.
 *
 * The Worker accepts ONLY these ids and derives the label and category from
 * this table, so no client-supplied text is ever stored. Regenerate with:
 *   node worker/gen-scenarios.js
 */

export const SCENARIOS = {
  "stroke": ["Suspected acute stroke","Neuro"],
  "tia": ["Transient ischaemic attack","Neuro"],
  "sah": ["Thunderclap headache / suspected subarachnoid haemorrhage","Neuro"],
  "headache_rf": ["Headache with red flags","Neuro"],
  "headinjury": ["Head injury","Neuro"],
  "seizure": ["First seizure / new epilepsy","Neuro"],
  "ms": ["Suspected demyelination / multiple sclerosis","Neuro"],
  "pituitary": ["Pituitary / sellar pathology","Neuro"],
  "cauda": ["Suspected cauda equina syndrome","Spine"],
  "spinalmets": ["Suspected metastatic spinal cord compression / bone metastases","Spine"],
  "backpain": ["Non-specific low back pain / radiculopathy","Spine"],
  "spinalinf": ["Suspected discitis / spinal infection","Spine"],
  "pe": ["Suspected pulmonary embolism","Chest"],
  "dissection": ["Suspected aortic dissection / acute aortic syndrome","Chest"],
  "aaa": ["Abdominal aortic aneurysm","Vascular"],
  "haemoptysis": ["Haemoptysis","Chest"],
  "lungca": ["Suspected lung cancer","Chest"],
  "ild": ["Suspected interstitial lung disease","Chest"],
  "pneumonia": ["Suspected pneumonia / chest infection","Chest"],
  "chestpain_cardiac": ["Stable chest pain / suspected coronary disease","Cardiac"],
  "dvt": ["Suspected deep vein thrombosis","Vascular"],
  "colic": ["Suspected renal / ureteric colic","Urology"],
  "haematuria": ["Haematuria","Urology"],
  "ruq": ["Right upper quadrant pain / suspected gallstones","Abdomen"],
  "jaundice": ["Jaundice / obstructive liver function tests","Abdomen"],
  "appendicitis": ["Suspected appendicitis","Abdomen"],
  "acuteabdo": ["Acute abdomen / suspected perforation or obstruction","Abdomen"],
  "mesenteric": ["Suspected mesenteric ischaemia","Abdomen"],
  "diverticulitis": ["Suspected diverticulitis","Abdomen"],
  "pancreatitis": ["Acute pancreatitis","Abdomen"],
  "ibd": ["Inflammatory bowel disease / small bowel assessment","Abdomen"],
  "liverlesion": ["Liver lesion characterisation / cirrhosis surveillance","Abdomen"],
  "crc": ["Suspected or staging colorectal cancer","Abdomen"],
  "pelvicmass": ["Pelvic mass / suspected gynaecological malignancy","Gynae"],
  "testis": ["Acute scrotal / testicular pain","Urology"],
  "prostate": ["Suspected prostate cancer","Urology"],
  "fracture": ["Suspected fracture / limb trauma","MSK"],
  "osteomyelitis": ["Suspected osteomyelitis / diabetic foot infection","MSK"],
  "septicjoint": ["Suspected septic arthritis","MSK"],
  "softtissue": ["Soft tissue lump / suspected sarcoma","MSK"],
  "shoulder": ["Shoulder pain / rotator cuff","MSK"],
  "staging": ["Cancer staging / restaging","Oncology"],
  "puo": ["Pyrexia of unknown origin / occult sepsis / weight loss","General"],
  "breast": ["Breast lump / suspected breast cancer","Breast"],
  "neck": ["Neck lump / thyroid nodule","Head&Neck"],
  "trauma": ["Major / polytrauma","Trauma"],
  "paed_general": ["Paediatric imaging","Paediatrics"]
};
