package com.email.assistant.Service;

import com.email.assistant.EmailRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Service
public class EmailGenService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;
    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    private final WebClient webClient = WebClient.builder().build();

    public String generateEmailReply(EmailRequest emailRequest, String perRequestKey) {
        String apiKey = (perRequestKey !=null && !perRequestKey.isBlank())
                ?perRequestKey:geminiApiKey;
        if(apiKey == null || apiKey.isBlank()){
            return "Error, no gemini API key set";
        }
        String prompt = buildPrompt(emailRequest);
        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );
        String response = webClient.post()
                .uri(geminiApiUrl + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        return extractResponseContent(response);
    }

    private String extractResponseContent(String response) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode rootNode = objectMapper.readTree(response);
            JsonNode textNode = rootNode.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");
            return textNode.isMissingNode() ? "No reply generated" : textNode.asString();
        } catch (Exception e) {
            return "Error processing request: " + e.getMessage();
        }
    }

    private String buildPrompt(EmailRequest emailRequest) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an AI email assistant. Your task is to generate a professional, natural, and contextually appropriate reply to the email provided below.\n" +
                "\n" +
                "Instructions:\n" +
                "- Understand the sender's intent and the purpose of the email before writing the reply.\n" +
                "- Write as if the recipient is personally responding to the sender.\n" +
                "- Keep the reply concise and relevant. Do not add unnecessary information.\n" +
                "- Maintain a professional, polite, and natural tone.\n" +
                "- Directly address the questions, requests, or points raised in the email.\n" +
                "- If the email asks for information that is not available from the provided content, do not invent or assume facts. Instead, acknowledge that the information is unavailable or ask for the necessary clarification.\n" +
                "- If the email is simply informational and does not require a detailed response, provide a brief acknowledgment.\n" +
                "- Preserve important names, dates, deadlines, numbers, and other factual details from the original email.\n" +
                "- Do not change the meaning or intent of the sender's message.\n" +
                "- Do not mention that you are an AI.\n" +
                "- Do not include explanations about why you wrote the reply.\n" +
                "- Do not include a subject line.\n" +
                "- Do not include placeholders such as [Name], [Date], or [Company] unless they already appear in the email.\n" +
                "- Do not add a signature unless one is explicitly provided.\n" +
                "- Return ONLY the email reply, with no surrounding quotation marks or commentary.\n" +
                "\n");

        String tone = emailRequest.getTone();
        if (tone != null && !tone.isBlank()) {
            prompt.append("Use a ").append(tone).append(" tone.\n");
        }

        prompt.append("Email to reply to:\n").append(emailRequest.getEmailContent());
        return prompt.toString();
    }
}