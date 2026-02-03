package com.zk.sky.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        org.springframework.web.servlet.config.annotation.CorsRegistration reg = registry.addMapping("/**");
        // Use compatibility utility to set allowed origins
        com.zk.sky.core.util.SpringCompatUtils.configureCorsAllowAll(reg);
        
        reg.allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
           .allowedHeaders("*")
           .allowCredentials(true);
    }
}
