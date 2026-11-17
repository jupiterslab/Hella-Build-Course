# Hella Build | Course experience standard (LOCKED)

## Non-negotiable product rule
**Students should never have to spend more mental effort navigating or organizing the course than they spend understanding and applying what they're learning.**

The system handles structure. The student handles thinking. Design for distracted, returning, overwhelmed and multi-skilled learners without assuming all ADHD learners are alike.

## Learning outcomes
Learner enters with varied, unnamed skills and exits with a **testable** offer: verified skills inventory, one skill stack, evidence-based target problem, Version 0 offer, initial price with rationale, documented delivery workflow, written scope rules, market test plan, and exportable blueprint. No income or business success guarantees.

## Eight-stage approved learning path
| Stage | Learning question | Artifact | Evidence to proceed |
|---|---|---|---|
| 1 Discover | What can I actually do? | Verified Skills Inventory | Three named skills with real examples |
| 2 Stack | Which skills work together? | Primary Skill Stack | Explain the value of the combination |
| 3 Position | Who needs this and why? | Audience + Problem Brief | Specific audience, problem, initial demand evidence |
| 4 Build | What am I selling? | Version 0 Offer | Outcome, inclusions, exclusions, completion |
| 5 Price | What should I charge? | Pricing Decision | Cost, capacity, market comparison, test price |
| 6 Systemize | How will I deliver it? | Five-stage Workflow + documented process | Can be followed without improvising every step |
| 7 Protect | How do I stay sustainable? | Scope Guide + Operating Statement | Clear change-request response and boundaries |
| 8 Test | Can I take it to market? | Final Blueprint + test plan | Explain, walkthrough and plan a real market test |

Every stage follows **Learn → Build → Verify → Save**. Teach one concept at a time; reuse prior answers; save immediately; provide clear human-centered feedback rather than arbitrary character-count gates. Allow usable drafts and later revisions.

## Interaction contract
1. One primary action visible at a time by default. No unbroken wall of lesson text.
2. Resume parser proposes tasks and skills with provenance; student confirms, corrects or removes each claim. Never infer unverified abilities or fabricate work history.
3. No repeated entry. Later steps prefill from a single versioned learner blueprint.
4. Auto-save after input, restore exact context, recover interrupted sessions, and surface save failures clearly.
5. Keep unrelated ideas in an optional, persistent Idea Vault that does not redirect the current build.
6. Persistent 'Where am I?' orientation explains previous artifact, current action, next outcome.
7. Adjustable focus and overview modes, readable text, keyboard access and reduced-motion compatibility.
8. AI help is optional, concise and question-specific. Never expose API keys to browsers; use authenticated server proxy with rate limits, consent and privacy controls for resumes.
9. Export coherent final Blueprint; avoid forcing duplicate worksheets.
10. Test with diverse ADHD and non-ADHD students using completion, interruptions, error rates, and time-on-task rather than visual polish alone.

## Current codebase status (2026-11-17)
Legacy implementation includes six module HTML pages. Module order does **not yet match** the approved eight-stage curriculum: legacy module 05 is Workflow and 06 Scope, while pricing, validation and later structural steps need sequencing/rebuild. Do not rename completion IDs or reinterpret existing learner data without migration.

Implemented in first pass: shared learner orientation panel, toggleable focus mode, optional authenticated Idea Vault on existing worksheet persistence, and an in-module output reminder. Existing module autosaves remain responsible for saving exercise inputs. This is **not** completion of the full experience contract.

## Next engineering milestones
1. Map current Supabase worksheet shapes and preserve student progress while migrating six legacy modules to eight-stage course schema.
2. Implement shared versioned blueprint state and automatic cross-module prefill.
3. Replace redundant visible worksheet sections with one-step Learn → Build → Verify → Save interaction, with real evidence-based checks.
4. Add server-side resume extraction and AI skill suggestions, privacy policy, consent and deletion. Never place AI API keys client-side.
5. Build modules 05 Pricing and 08 Market Test, migrate workflow/scope to stages 06/07, and align navigation.
6. Implement finished-blueprint export and administration QA metrics.
7. Run end-to-end keyboard/mobile/reduced-motion/ADHD usability tests, including save failure and resume interruption.
