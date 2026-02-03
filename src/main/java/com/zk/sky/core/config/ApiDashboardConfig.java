package com.zk.sky.core.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan(basePackages = {
    "com.zk.sky.core.controller",
    "com.zk.sky.core.config" // for WebConfig
})
public class ApiDashboardConfig {
}
