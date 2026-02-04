package com.sky.core.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

/**
 * API Dashboard 自动配置类
 * <p>
 * 通过 {@code @EnableApiDashboard} 注解自动导入，负责扫描并注册 Dashboard 相关的组件：
 * <ul>
 *   <li>控制器（ApiDashboardController）</li>
 *   <li>Web 配置（WebConfig - CORS 设置）</li>
 *   <li>异常处理器（DashboardExceptionHandler）</li>
 * </ul>
 * </p>
 * 
 * @see com.sky.core.annotation.EnableApiDashboard
 * @since 1.0.0
 */
@Configuration
@ComponentScan(basePackages = {
    "com.sky.core.controller",  // Dashboard 控制器
    "com.sky.core.config"       // Web 配置（CORS）
})
public class ApiDashboardConfig {
}
