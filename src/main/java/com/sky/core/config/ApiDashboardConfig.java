package com.sky.core.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan(basePackages = {
    "com.sky.core.controller",
    "com.sky.core.config" // for WebConfig
})
public class ApiDashboardConfig {
}
