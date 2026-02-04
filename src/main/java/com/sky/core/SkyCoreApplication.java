package com.sky.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Sky-Core 应用程序入口
 * <p>
 * Spring Boot 启动类，自动启用 API Dashboard 功能。
 * </p>
 * 
 * @author Sky Team
 * @since 1.0.0
 */
@SpringBootApplication
@com.sky.core.annotation.EnableApiDashboard
public class SkyCoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(SkyCoreApplication.class, args);
	}

}
