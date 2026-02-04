package com.sky.core.annotation;

import com.sky.core.config.ApiDashboardConfig;
import org.springframework.context.annotation.Import;
import java.lang.annotation.*;

/**
 * 启用 API Dashboard 功能
 * <p>
 * 在 Spring Boot 启动类上添加此注解即可自动启用 API 仪表盘功能。
 * </p>
 * 
 * <h3>使用示例：</h3>
 * <pre>{@code
 * @SpringBootApplication
 * @EnableApiDashboard
 * public class Application {
 *     public static void main(String[] args) {
 *         SpringApplication.run(Application.class, args);
 *     }
 * }
 * }</pre>
 * 
 * <h3>功能特性：</h3>
 * <ul>
 *   <li>自动扫描所有 {@code @RestController} 和 {@code @Controller} 接口</li>
 *   <li>提供可视化的 API 列表页面（路径：/api-dashboard）</li>
 *   <li>支持在线测试和调试 API</li>
 *   <li>支持导出 Markdown 接口文档</li>
 * </ul>
 * 
 * @see com.sky.core.config.ApiDashboardConfig
 * @author Sky Team
 * @since 1.0.0
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Import(ApiDashboardConfig.class)
public @interface EnableApiDashboard {
}
