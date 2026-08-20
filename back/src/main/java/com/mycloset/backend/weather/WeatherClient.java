package com.mycloset.backend.weather;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.http.HttpTimeoutException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycloset.backend.common.ApiException;

@Component
public class WeatherClient implements WeatherGateway {

    private static final Logger log = LoggerFactory.getLogger(WeatherClient.class);

    private final RestClient restClient;
    private final WeatherProperties properties;
    private final ObjectMapper objectMapper;

    public WeatherClient(RestClient weatherRestClient, WeatherProperties properties, ObjectMapper objectMapper) {
        this.restClient = weatherRestClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public WeatherInfo getCurrentWeather(double latitude, double longitude) {
        String responseBody;
        try {
            responseBody = restClient
                    .get()
                    .uri(weatherUri(latitude, longitude))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            log.warn(
                    "Weather server returned status={}",
                    exception.getStatusCode().value());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "날씨 정보를 가져올 수 없습니다.");
        } catch (RestClientException exception) {
            throw translateConnectionException(exception);
        }

        return parseWeather(responseBody);
    }

    private WeatherInfo parseWeather(String responseBody) {
        try {
            JsonNode response = objectMapper.readTree(responseBody);
            JsonNode list = response.path("list");
            JsonNode nearest = list.path(0);
            JsonNode nearestMain = nearest.path("main");
            if (!list.isArray() || list.isEmpty() || !nearestMain.path("temp").isNumber()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "날씨 서버 응답 형식이 올바르지 않습니다.");
            }

            double temp = nearestMain.path("temp").asDouble();
            String condition =
                    nearest.path("weather").path(0).path("description").asText("");

            String dtText = nearest.path("dt_txt").asText("");
            String today = dtText.length() >= 10 ? dtText.substring(0, 10) : "";

            double tempMin = temp;
            double tempMax = temp;
            for (JsonNode entry : list) {
                if (!today.isEmpty() && !entry.path("dt_txt").asText("").startsWith(today)) {
                    continue;
                }
                JsonNode entryMain = entry.path("main");
                double entryTemp = entryMain.path("temp").asDouble(temp);
                tempMin = Math.min(tempMin, entryMain.path("temp_min").asDouble(entryTemp));
                tempMax = Math.max(tempMax, entryMain.path("temp_max").asDouble(entryTemp));
            }

            return new WeatherInfo(temp, condition, tempMin, tempMax);
        } catch (JsonProcessingException exception) {
            log.warn("Weather server returned invalid JSON", exception);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "날씨 서버 응답 형식이 올바르지 않습니다.");
        }
    }

    private URI weatherUri(double latitude, double longitude) {
        return UriComponentsBuilder.fromUriString(properties.getBaseUrl())
                .queryParam("lat", latitude)
                .queryParam("lon", longitude)
                .queryParam("appid", properties.getApiKey())
                .queryParam("units", "metric")
                .queryParam("lang", "kr")
                .build()
                .toUri();
    }

    private ApiException translateConnectionException(RestClientException exception) {
        if (isTimeout(exception)) {
            log.warn("Weather server request timed out", exception);
            return new ApiException(HttpStatus.GATEWAY_TIMEOUT, "날씨 서버 응답 시간이 초과했습니다.");
        }
        if (exception instanceof ResourceAccessException) {
            log.warn("Weather server connection failed", exception);
            return new ApiException(HttpStatus.BAD_GATEWAY, "날씨 서버에 연결할 수 없습니다.");
        }
        log.warn("Weather server request failed", exception);
        return new ApiException(HttpStatus.BAD_GATEWAY, "날씨 서버 요청을 처리할 수 없습니다.");
    }

    private boolean isTimeout(Throwable exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof SocketTimeoutException || current instanceof HttpTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
