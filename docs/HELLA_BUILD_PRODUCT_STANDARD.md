# HELLA BUILD | Product and Learning Experience Contract

Status: APPROVED PRODUCT STANDARD | 2026-11-17
Price positioning: $500 self-paced experience. This document defines intended experience; it does not claim all features are shipped.

## Non-negotiable product requirement
> Students should never have to spend more mental effort navigating or organizing the course than they spend understanding and applying what they're learning.

**The system handles the structure. The student handles the thinking.**

Audience includes multi-skilled, scattered, and ADHD learners, but no single interface works for every ADHD learner. Test with varied users. Student autonomy is essential: guide rather than trap, assist rather than fabricate.

## Learning promise and boundary
Starting state: student has experience across roles, interests, and projects but cannot readily name, combine, position, price, or deliver those abilities.
Ending state: student has a *testable* priced offer plus documented delivery and scope system. Not an income guarantee; market testing is still required.

## Eight-module target journey
| Module | Main question | Skill to learn | Action | Persisted artifact | Completion criterion |
|---|---|---|---|---|---|
| 01 Extract | What can I actually do? | Distinguish roles, tasks, skills, outcomes | Resume upload or manual entry; review AI-suggested repeated functions; verify with examples | Verified Skills Inventory | 3 evidenced abilities with example |
| 02 Stack | Which abilities combine? | Recognize complementary functions | Compare up to three stacks; choose one for this build | Primary Skill Stack | Explains combined advantage in plain language |
| 03 Position | Who needs this? | Separate skill from demand | Define audience/problem and gather initial willingness-to-pay evidence | Audience + Problem Brief | Specific problem, affected buyer, initial evidence |
| 04 Offer | What am I selling? | Create bounded promise | Define outcome, deliverables, exclusions, format, timeline | Version 0 Offer | Customer can understand scope and outcome |
| 05 Price | What should I charge? | Cost/capacity/market-informed pricing | Calculate costs, compare alternatives, select test price | Pricing Decision | Explains price and basic delivery economics |
| 06 Systemize | How do I deliver it? | Document a repeatable process | Map major stages, inputs/outputs and one detailed SOP | Workflow Map + SOP | Qualified peer could follow the documented process |
| 07 Protect | How do I keep this sustainable? | Scope changes and operating boundaries | Define revisions, communication, exclusions, change request | Scope + Boundaries Guide | Can handle out-of-scope scenario |
| 08 Test | Is this ready for the real world? | Validate assumptions and plan iteration | Walk through delivery; present offer; define small market test | Final Hella Build Blueprint + test plan | Can explain offer and identify next external validation action |

Existing repository currently exposes module1.html through module6.html. This roadmap is not an assertion that modules 07/08 or every artifact exist yet. Map existing lesson content to these outcomes before replacing or renumbering anything.

## Interaction contract for EACH module
1. **Learn**: one central concept, concise explanation, one concrete example, optional detail on demand.
2. **Build**: one meaningful action at a time, relevant prefilled context, manual alternative to AI.
3. **Verify**: learner checks evidence and accuracy; ambiguous results get one clear next action, never an opaque failure.
4. **Save**: autosave with truthful status, visible contribution to consolidated blueprint, one next step.

Do NOT repurpose the book's chapter worksheets as ten separate forms. Use them as source material for the above generated artifacts. No forced journal prompts or recopying prior inputs.

## Cognitive-friction acceptance criteria
- One clear task / primary CTA in the active viewport.
- No unnecessary scrolling or competing panels to complete a single decision.
- Relevant prior answers appear already populated; edits are possible and trace to their source.
- An Idea Vault preserves alternatives when one stack, audience, or offer is selected.
- No arbitrary '70% of roles' skill threshold or universal 30-90 day offer requirement.
- Every input is saved persistently with a visible saved/error state; restore position on return.
- Provide 'Where am I?' with current step, last completed artifact, and exact next action.
- Just-in-time 'Help me figure this out' with concise definitions, examples, and one-question-at-a-time prompts.
- Optional reduced-motion, compact/full-context view, and text/audio where available. Never force all ADHD learners into one pattern.
- The AI Skill Translator suggests roles/functions/skills and shows evidence/provenance; user reviews and confirms. Do not invent a role, task, achievement, market demand, or sale.
- Resume processing must have explicit consent, server-side API-key storage, privacy controls, size/type validation and clear deletion/retention behavior. Do not put AI provider secret keys in browser JavaScript.
- Checkpoints validate an answer's utility, not arbitrary perfection. Drafts can be revisited. No trapping students behind vague gates.
- All eight artifacts must consolidate into one editable/exportable Hella Build Blueprint.

## Data model (target)
learner_profile {user_id, cognitive_preferences, current_module, current_step, updated_at}
experience {user_id, source_type, source_ref, role, repeated_functions[], evidence[]}
skills {user_id, label, evidence_refs[], ai_suggested, user_confirmed}
skill_stacks {user_id, core_skill_id, supporting_skill_ids[], selected, archived}
idea_vault {user_id, type, title, detail, source_module, created_at}
blueprint {user_id, audience_problem, version0_offer, pricing, workflow, boundaries, market_test, revision, updated_at}
progress {user_id, module_id, active_step, verified_artifact, saved_at}

Cross-device persistent storage requires authenticated backend tables and appropriate row-level security. A localStorage helper alone is not sufficient.

## Test script for five varied learners
1. Resume-heavy multi-industry learner: upload, review, correct and confirm skills; no hallucinated credentials.
2. No-resume learner: manually enter experiences; reaches the same output.
3. Scattered learner: records five ideas, picks one; later retrieves all alternatives from Idea Vault.
4. Interrupted learner: close mid-exercise, return later or on another authorized device; work and position survive.
5. Low-stimulation learner: reduced motion, minimal prompts and keyboard-only operation; no progress loss.

For every module verify: (a) student can state what they learned, (b) student produces the specified artifact, (c) system saves it, (d) next module uses it without recopying, (e) error states are honest.

## Release gate
Do not mark the course ready solely because the screens look good. Require a full eight-module walkthrough, persisted data checks, prompt/evidence QA, security check on resume files and AI keys, and observed usability testing with varied ADHD learners. Measure abandonment, repeat questions, save failures, backtracking, time spent organizing versus performing learning tasks, and whether learners can describe their offer at the end.

## Existing implementation note
The current module pages and scripts must be audited against this contract incrementally. Preserve existing student data structures and autosave mechanisms until migrations are proven. Do not silently remove content, replace curricula, or deploy untested changes.
