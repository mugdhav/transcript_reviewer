## Inspiration
A smart transcriber for audio and video files that can not only generate text transcripts/subtitles, but also reviews and corrects text, so that the subtitles are free of any errors - homophones, accent misrecognition, incorrect punctuation, and more. Correct subtitles are crucial for accessibility as well as accurate audio/video summarization. 

## What it does
This application generates subtitles in SRT (SubRip Subtitle) format for MP3 and MP4 files of size up to 25MB using Gemini 3 models.
Auto-generated subtitles often are incorrect, with errors like use of homophones, accent misrecognition, incorrect punctuation, and more. Therefore, this application also:
- Reviews the generated subtitles and auto-corrects any errors that it has a high confidence of correcting. It also enables users to review these auto-corrections.
- Walks users through the potential errors it is not confident to correct, providing correction suggestions.
- Enables users to manually correct subtitle text, including auto-corrected text, in an interactive review synced to audio/video play.

## How we built it
With Antigravity:
-   **Frontend**: React, TanStack Query, ShadCN UI, Tailwind CSS.
-   **Backend**: Node.js (Express).
-   **AI/ML**: Google Gemini 3 API (gemini-3-flash-preview)

## Challenges we ran into
- Model rate limits
- Frequent model unavailability

## Accomplishments that we're proud of
- Smart transcription generation, auto-correction, and user review
- Enterprise-grade UX
- No user data retained

## What we learned
1. AI Model Resilience - **Implement robust retry logic early.** Added a 3-attempt retry loop with a 10-second countdown. We also expanded error catching to include generic `TypeError` and "fetch" related messages, which significantly increased the application's perceived stability.

2. LLM Behavior Control - The LLM initially made stylistic "improvements" (changing valid text) instead of just fixing errors, and its explanation format was inconsistent. Its require control by explicit prompts to "not make stylistic changes" and enforcing a strict format for auto-correction details
Negative constraints are as important as positive ones to achieved predictable, high-quality results.

3. Decouple build logic - Separating the build into a dedicated `script/build.ts` and refactoring `vite.config.ts` to be more modular made the Docker image stable and compatible across different hosting environments.

4. Security - Documenting how the `GOOGLE_API_KEY` is handled securely (server-side only) builds user trust.

## What's next for MV Subtitle Generator
- Ability to auto-switch models based on performance, cost, and availability considerations.
- Performance improvement