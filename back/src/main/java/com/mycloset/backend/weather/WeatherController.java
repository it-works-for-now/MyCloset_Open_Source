package com.mycloset.backend.weather;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherGateway weatherGateway;

    public WeatherController(WeatherGateway weatherGateway) {
        this.weatherGateway = weatherGateway;
    }

    @GetMapping
    public WeatherInfo current(@RequestParam double latitude, @RequestParam double longitude) {
        return weatherGateway.getCurrentWeather(latitude, longitude);
    }
}
