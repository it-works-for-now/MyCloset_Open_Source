package com.mycloset.backend.config;

import java.nio.file.Path;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.mycloset.backend.clothes.LocalImageStorageProperties;

@Configuration
@EnableConfigurationProperties(LocalImageStorageProperties.class)
public class LocalImageStorageConfig implements WebMvcConfigurer {

    private final LocalImageStorageProperties properties;

    public LocalImageStorageConfig(LocalImageStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(properties.getDirectory())
                .toAbsolutePath()
                .normalize()
                .toUri()
                .toString();
        if (!location.endsWith("/")) {
            location += "/";
        }
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
