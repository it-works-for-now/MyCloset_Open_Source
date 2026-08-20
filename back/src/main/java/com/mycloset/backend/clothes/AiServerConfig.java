package com.mycloset.backend.clothes;

import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
@EnableConfigurationProperties(AiServerProperties.class)
public class AiServerConfig {

    @Bean
    ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }

    @Bean
    RestClient aiServerRestClient(AiServerProperties properties) {
        return buildRestClient(Duration.ofSeconds(properties.getTimeoutSeconds()));
    }

    /** Recommendation and image generation calls run far longer than a garment analysis call. */
    @Bean
    RestClient aiServerDailyLookRestClient(AiServerProperties properties) {
        return buildRestClient(Duration.ofSeconds(properties.getDailyLookTimeoutSeconds()));
    }

    private RestClient buildRestClient(Duration timeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);

        return RestClient.builder().requestFactory(requestFactory).build();
    }
}
