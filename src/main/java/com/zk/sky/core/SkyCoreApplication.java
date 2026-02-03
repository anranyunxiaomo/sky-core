package com.zk.sky.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Smart Relay 应用程序入口
 * <p>
 * 也就是Spring Boot 启动类。
 * </p>
 */
@SpringBootApplication
@com.zk.sky.core.annotation.EnableApiDashboard
public class SkyCoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(SkyCoreApplication.class, args);
	}

}
