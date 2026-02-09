# Lessons Learned: Gemini Subtitle Reviewer Development

This document summarizes the key technical challenges and solutions discovered during the migration and development of the Gemini Subtitle Reviewer.

## 1. AI Model Resilience
### The Challenge
Early testing showed that preview models (like `gemini-3-flash-preview`) often return `503 Service Unavailable` errors during peak times. Additionally, transient network drops caused `fetch failed` exceptions.
### The Lesson
**Implement robust retry logic early.** We added a 3-attempt retry loop with a 10-second countdown. We also expanded error catching to include generic `TypeError` and "fetch" related messages, which significantly increased the application's perceived stability.

## 2. LLM Prompt Precision
### The Challenge
The AI initially made stylistic "improvements" (changing valid tone) instead of just fixing errors, and its explanation format was inconsistent.
### The Lesson
**Negative constraints are as important as positive ones.** By explicitly adding "Do NOT make stylistic changes" and enforcing a strict `"Original -> Changed"` string format in the prompt, we achieved predictable, high-quality results that were easier for the UI to display.

## 3. Containerization & Build Systems
### The Challenge
The migration from Hugging Face to a custom Docker/Cloud Run environment revealed issues with how Vite was configured for local vs. production builds, specifically handling top-level `await` and dynamic ports.
### The Lesson
**Decouple build logic.** Separating the build into a dedicated `script/build.ts` and refactoring `vite.config.ts` to be more modular made the Docker image stable and compatible across different hosting environments.

## 4. State Management in Navigation
### The Challenge
A standard client-side route change back to the "Home" page often left the internal React state (job IDs, view states) partially populated, causing UI bugs in error recovery.
### The Lesson
**For "Reset" features, favor a full reload.** Using a standard HTML `<a>` tag for the "Return to Home" button in error states ensured a 100% clean slate, which is more robust than trying to manually reset complex component trees.

## 5. Security Context
### The Challenge
Users need to know how their data is handled.
### The Lesson
**Context-aware AI requires explicit boundaries.** We learned to emphasize that the user-provided "Context" is the key to perfect transcription, and documenting exactly how the `GOOGLE_API_KEY` is handled securely (server-side only) builds user trust.
