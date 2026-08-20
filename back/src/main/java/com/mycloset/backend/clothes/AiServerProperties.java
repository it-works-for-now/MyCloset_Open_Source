package com.mycloset.backend.clothes;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai-server")
public class AiServerProperties {

    private String baseUrl;
    private String dailyLookBaseUrl;
    private String apiKey = "";
    private long timeoutSeconds = 60;
    private long dailyLookTimeoutSeconds = 180;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getDailyLookBaseUrl() {
        return dailyLookBaseUrl == null || dailyLookBaseUrl.isBlank() ? baseUrl : dailyLookBaseUrl;
    }

    public void setDailyLookBaseUrl(String dailyLookBaseUrl) {
        this.dailyLookBaseUrl = dailyLookBaseUrl;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public long getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(long timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public long getDailyLookTimeoutSeconds() {
        return dailyLookTimeoutSeconds;
    }

    public void setDailyLookTimeoutSeconds(long dailyLookTimeoutSeconds) {
        this.dailyLookTimeoutSeconds = dailyLookTimeoutSeconds;
    }
}
