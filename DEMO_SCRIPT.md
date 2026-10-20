# LUMA — 3-Minute Demo Script

**Device:** Vega Virtual Device (x86_64), remote in hand. All navigation is D-pad + OK + Back.
**Judges see:** the TV screen only. Narration below is verbatim-suggested, timing per beat.

---

## Beat 1 — Hook (0:00–0:25) · Home

*Press: none — Home is live.*

> "It's movie night. Nobody remembers what's on, and everyone wants something different.
> LUMA is a TV companion that turns plain language into **three real picks — with reasons**.
> It runs **fully offline** on Vega OS, and everything it claims, it can show you."

Show, in this order (no clicks needed):

1. "What are you in the mood for?" — the voice-ready entry.
   > "Voice capture isn't in this Vega SDK build, so LUMA says so **in the app** instead of
   > pretending — everything below works with the remote today."
2. The **TRY A REQUEST** chips and the featured catalogue.

---

## Beat 2 — Conversation & follow-ups (0:25–1:05)

*Press: **OK** on the first suggestion "An adventurous family movie night, nothing too scary, under two hours".*

> "Watch the request bar: LUMA kept everything I said — genre, adventure, family-suitable,
> nothing frightening, under two hours. The badge shows what just changed."

*Press: **Down** to the first follow-up, **OK**: "Make it more adventurous, keep everything else".*

> "Follow-ups keep context: it only adjusted the adventure level and kept every other
> constraint — and it shows me exactly that with the change badges. No re-typing, no
> starting over."

If asked about errors:
> "An unrecognised request gets a clarification, not a guess — and there's a *Start over*
> that clears the session and says so."

---

## Beat 3 — Recommendations & honesty (1:05–1:50)

*Press: **Down** to ACTIONS, **OK** on "See recommendations".*

> "At most three titles — never a wall. Each has a score out of 100, and next to it the
> actual reasons: runtime fits the ceiling, genre match, family rating verified from the
> catalogue."

*Press: **Right** across the cards, stop on the second.*

> "And the honest parts: **unverified** metadata is shown as unverified — LUMA never
> invents a genre or a rating to make a title pass. Below the cards: what was filtered
> out, and why — for example, 'family-suitable flag not verifiable'."

*Press: **OK** on a card → Details.*

> "Details shows only what the catalogue really holds. See this row: *'Not verified by
> LUMA'* — that is the product principle in one line."

*Press: **Back**.*

---

## Beat 4 — Group Harmony (1:50–2:35)

*Press: **Back** to Home (or Down to "Group Harmony" from Home), **OK** on Group Harmony.*

> "One request is easy. Three people are hard. LUMA models the room: likes, avoids, an
> intensity ceiling, and a family-suitable toggle per person — all editable with the
> remote."

*Press: **Right** a few times over the genre chips, **OK** on one to cycle
like → avoid → off; optionally **OK** on a member's intensity chip.*

> "Every press cycles a preference — no typing required. The compatibility preview below
> re-scores instantly and shows each person's satisfied / unmet / unverified constraints
> plus the trade-offs LUMA had to make."

*Press: **Down** to **OK** on "Find something that works for everyone".*

> "And the group request runs through the same pipeline — same explanations, same
> honesty."

---

## Beat 5 — Memory & reset (2:35–2:55)

*Press: **Down** to "See recommendations", **OK** — then **Back** to Home.*

> "The session remembers everything until I say otherwise — there's the recent pick I
> just explored. And one press on **Clear session** wipes the conversation and says
> exactly that. No silent memory, no creepiness."

*Press: **OK** on "Clear session".*

> "Back to zero. Deterministic — same request, same three picks, every time."

---

## Beat 6 — Close (2:55–3:00)

> "LUMA: offline-first, explainable, honest about what it doesn't know — voice, playback,
> and metadata included. Seventy automated tests, all green. Built on the Vega React
> Native stack with the remote as the only input it trusts today. Thank you."

---

## Backup beats (if time slips — cut in this order)

1. Beat 4's genre-cycling demo (keep the narration, skip the extra presses).
2. Beat 3's "filtered out" scroll (keep the one-line mention).
3. Beat 5's recent-chip reopen (keep only the reset press).

## If a judge asks

- **"Why no voice?"** — The Vega SDK (0.24.12112) exposes no microphone/speech API to
  React Native. Faking a waveform would be dishonest; the app states the limitation and
  the integration point (`src/engine/voiceProvider.ts`) is written and documented.
- **"Why can't it play anything?"** — LUMA is a discovery layer; there is no content
  service credential or playback API in scope, and a dead "Play" button is worse than an
  honest "Playback is not connected".
- **"Is the AI real?"** — The default is a deterministic local engine (70 tests). A
  remote LLM is implemented behind a provider abstraction, disabled in the shipped
  config; if enabled and it fails, the app falls back locally **and says so in the UI**.
- **"Where does the artwork come from?"** — Generated on device from the title's own
  data. No hot-linking, no licensing exposure, works offline.
