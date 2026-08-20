package com.mycloset.backend.weather;

public interface WeatherGateway {

    WeatherInfo getCurrentWeather(double latitude, double longitude);
}
