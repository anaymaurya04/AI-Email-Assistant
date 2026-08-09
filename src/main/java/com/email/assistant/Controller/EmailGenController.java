package com.email.assistant.Controller;

import com.email.assistant.EmailRequest;
import com.email.assistant.Service.EmailGenService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email")
@AllArgsConstructor
public class EmailGenController {
    private final EmailGenService emailGenService;
    @PostMapping("/generate")
    public ResponseEntity<String> generateEmail(@RequestBody EmailRequest emailRequest,
                                                @RequestHeader(value = "X-Gemini-Key", required = false)String geminiApiKey){
        String response = emailGenService.generateEmailReply(emailRequest,geminiApiKey);
        return ResponseEntity.ok(response);
    }
}
