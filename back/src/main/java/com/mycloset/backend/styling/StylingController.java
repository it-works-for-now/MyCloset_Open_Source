package com.mycloset.backend.styling;

import java.security.Principal;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.mycloset.backend.styling.dto.StylingResponse;
import com.mycloset.backend.styling.dto.StylingSaveRequest;

@RestController
@RequestMapping("/api/stylings")
public class StylingController {

    private final StylingService stylingService;

    public StylingController(StylingService stylingService) {
        this.stylingService = stylingService;
    }

    @GetMapping
    public List<StylingResponse> findMyStylings(Principal principal) {
        return stylingService.findMyStylings(principal.getName());
    }

    @GetMapping("/{stylingId}")
    public StylingResponse findMyStyling(Principal principal, @PathVariable Long stylingId) {
        return stylingService.findMyStyling(principal.getName(), stylingId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StylingResponse create(Principal principal, @Valid @RequestBody StylingSaveRequest request) {
        return stylingService.create(principal.getName(), request);
    }

    @PutMapping("/{stylingId}")
    public StylingResponse update(
            Principal principal, @PathVariable Long stylingId, @Valid @RequestBody StylingSaveRequest request) {
        return stylingService.update(principal.getName(), stylingId, request);
    }

    @DeleteMapping("/{stylingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long stylingId) {
        stylingService.delete(principal.getName(), stylingId);
    }
}
