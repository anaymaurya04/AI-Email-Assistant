# Email Assistant

Generate smart, professional email replies with Google Gemini — a Spring Boot backend plus a Chrome extension that lives right inside Gmail.

## Features
- One-click **"Generate reply"** button inside Gmail compose
- Tone selection: professional / friendly / concise / formal
- Replies inserted above the quoted email, ready to send
- Gemini `gemini-3.6-flash` via a Spring Boot backend
- API key stays on the server — never exposed to the browser

## Tech Stack
- **Backend:** Java 17 · Spring Boot 4.1.0 · Spring Web MVC · WebClient · Maven
- **Model:** Google Gemini `gemini-3.6-flash`
- **Extension:** Chrome Manifest V3 · vanilla JS · no build step

## Project Structure
email-assistant/
├── src/main/java/com/email/assistant/
│   ├── EmailAssistantApplication.java
│   ├── EmailRequest.java
│   ├── Config/WebConfig.java            # CORS for the extension
│   ├── Controller/EmailGenController.java
│   ├── Service/EmailGenService.java
│   └── GlobalExceptionHandler.java      # readable Gemini errors
├── src/main/resources/application.properties
└── extension/                            # Chrome extension
    ├── manifest.json
    ├── content.js
    └── content.css

## Prerequisites
- JDK 17+
- Maven
- A Google Gemini API key — https://aistudio.google.com/apikey
- Google Chrome (for the extension)

## Setup
1. Get a Gemini API key.
2. Set two environment variables:
   - `GEMINI_API_KEY=<your-key>`
   - `GEMINI_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=`
3. In IntelliJ: **Run ▸ Edit Configurations ▸ Modify options ▸ Environment variables** (no spaces around `=`, separate with `;`).

## Run the Backend
mvn spring-boot:run
The app starts at `http://localhost:8080`.


500 Internal Server Error — Gemini returned an error, usually 503 "model busy". Wait a few seconds and retry, or check GEMINI_URL for a stray =. The app now returns the real Gemini error message instead of a raw 500.
Reply has no spaces between words — caused by unstable model aliases like gemini-flash-latest. Pin a stable model (gemini-3.6-flash) in GEMINI_URL.
Button doesn't appear in Gmail — Gmail's DOM changes over time. Open the browser console for errors and re-load the extension.
