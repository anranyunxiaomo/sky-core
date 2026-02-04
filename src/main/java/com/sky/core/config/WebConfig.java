package com.sky.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 全局配置
 * <p>
 * 配置 CORS（跨域资源共享）策略，允许前端页面调用 Dashboard API。
 * 使用兼容性工具类支持多个 Spring Boot 版本。
 * </p>
 * 
 * @see com.sky.core.util.SpringCompatUtils
 * @since 1.0.0
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * 配置 CORS 跨域策略
     * <p>
     * 允许所有来源访问 Dashboard 接口，支持的配置：
     * <ul>
     *   <li>路径：/** （所有路径）</li>
     *   <li>来源：* （所有域名，使用兼容性方法）</li>
     *   <li>方法：GET, POST, PUT, DELETE, PATCH, OPTIONS</li>
     *   <li>请求头：* （所有请求头）</li>
     *   <li>凭证：允许携带 Cookie</li>
     * </ul>
     * </p>
     * 
     * <p><b>注意</b>：
     * 生产环境建议限制 {@code allowedOrigins} 为特定域名，
     * 避免安全风险。
     * </p>
     * 
     * @param registry CORS 注册器
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        org.springframework.web.servlet.config.annotation.CorsRegistration reg = registry.addMapping("/**");
        
        // 使用兼容性工具类设置允许的来源（支持 Spring Boot 2.0 - 2.7+）
        com.sky.core.util.SpringCompatUtils.configureCorsAllowAll(reg);
        
        // 配置允许的 HTTP 方法和请求头
        reg.allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
           .allowedHeaders("*")
           .allowCredentials(true);  // 允许携带认证信息（Cookie、Authorization 等）
    }
}
