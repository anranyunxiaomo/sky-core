package com.sky.core.util;

import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.mvc.condition.PatternsRequestCondition;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Spring 版本兼容性工具类
 * <p>
 * 通过反射机制处理不同 Spring Boot 版本（2.0 - 2.7+）之间的 API 差异，
 * 确保代码能在多个版本上正常运行，避免 {@code NoSuchMethodError} 运行时错误。
 * </p>
 * 
 * <h3>支持的兼容性场景：</h3>
 * <ul>
 *   <li><b>CORS 配置</b>：
 *     <ul>
 *       <li>Spring Boot 2.0-2.3：使用 {@code allowedOrigins("*")}</li>
 *       <li>Spring Boot 2.4+：使用 {@code allowedOriginPatterns("*")}</li>
 *     </ul>
 *   </li>
 *   <li><b>URL 模式提取</b>：
 *     <ul>
 *       <li>旧版：{@code getPatternsCondition().getPatterns()}</li>
 *       <li>新版（Spring 5.3+）：{@code getPathPatternsCondition().getPatterns().getPatternString()}</li>
 *     </ul>
 *   </li>
 * </ul>
 * 
 * @author Sky Team
 * @since 1.0.0
 */
public class SpringCompatUtils {

    /**
     * 安全地配置 CORS 允许所有来源
     * <p>
     * 自动检测 Spring 版本并使用正确的 API：
     * <ul>
     *   <li><b>Spring 5.3+（Boot 2.4+）</b>：调用 {@code allowedOriginPatterns("*")}</li>
     *   <li><b>Spring 4.2-5.2（Boot 2.0-2.3）</b>：调用 {@code allowedOrigins("*")}</li>
     * </ul>
     * </p>
     * 
     * <h3>使用示例：</h3>
     * <pre>{@code
     * @Override
     * public void addCorsMappings(CorsRegistry registry) {
     *     CorsRegistration reg = registry.addMapping("/**");
     *     SpringCompatUtils.configureCorsAllowAll(reg);
     * }
     * }</pre>
     * 
     * <p><b>安全提示</b>：
     * 生产环境建议使用具体域名代替 {@code "*"}，避免安全风险。
     * </p>
     * 
     * @param registry CORS 注册对象
     */
    public static void configureCorsAllowAll(CorsRegistration registry) {
        try {
            // Spring 5.3+（Boot 2.4+）：优先尝试 allowedOriginPatterns("*")
            Method method = CorsRegistration.class.getMethod("allowedOriginPatterns", String[].class);
            method.invoke(registry, (Object) new String[]{"*"});
        } catch (Exception e) {
            try {
                // Spring 4.2-5.2（Boot 2.0-2.3）：降级到 allowedOrigins("*")
                Method method = CorsRegistration.class.getMethod("allowedOrigins", String[].class);
                method.invoke(registry, (Object) new String[]{"*"});
            } catch (Exception ex) {
                // 兼容性检查失败，静默忽略（Spring 版本过旧或不支持）
                // 理论上不应该到达这里，除非使用了非常旧的 Spring 版本
            }
        }
    }

    /**
     * 提取 RequestMappingInfo 中的 URL 模式
     * <p>
     * 兼容 AntPathMatcher（旧版）和 PathPatternParser（新版）两种路径匹配策略：
     * <ul>
     *   <li><b>旧版（Spring Boot < 2.4）</b>：从 {@code getPatternsCondition()} 获取</li>
     *   <li><b>新版（Spring 5.3+）</b>：从 {@code getPathPatternsCondition()} 获取</li>
     * </ul>
     * </p>
     * 
     * <h3>使用示例：</h3>
     * <pre>{@code
     * RequestMappingInfo info = ...;
     * Set<String> patterns = SpringCompatUtils.getActivePatterns(info);
     * // patterns = ["/api/users", "/api/users/{id}"]
     * }</pre>
     * 
     * @param info Spring MVC RequestMappingInfo 对象
     * @return URL 模式集合（如 {"/api/users", "/api/login"}），失败时返回空集合
     */
    public static Set<String> getActivePatterns(RequestMappingInfo info) {
        Set<String> patterns = new HashSet<>();

        // 1. Try Legacy: getPatternsCondition() -> getPatterns()
        try {
             PatternsRequestCondition condition = info.getPatternsCondition();
             if (condition != null) {
                 patterns.addAll(condition.getPatterns());
             }
        } catch (Exception e) {
            // Ignore
        }

        // 2. Try New (Spring 5.3+): getPathPatternsCondition() -> getPatterns() -> getPatternString()
        // Use reflection to avoid compile/runtime errors if class is missing on classpath on very old constructs
        try {
            Method getPathPatternsMethod = RequestMappingInfo.class.getMethod("getPathPatternsCondition");
            Object pathPatternsCondition = getPathPatternsMethod.invoke(info);
            
            if (pathPatternsCondition != null) {
                Method getPatternsMethod = pathPatternsCondition.getClass().getMethod("getPatterns");
                Set<?> pathPatterns = (Set<?>) getPatternsMethod.invoke(pathPatternsCondition);
                
                if (pathPatterns != null) {
                    for (Object pathPattern : pathPatterns) {
                         // PathPattern.getPatternString()
                         Method getPatternString = pathPattern.getClass().getMethod("getPatternString");
                         String pattern = (String) getPatternString.invoke(pathPattern);
                         patterns.add(pattern);
                    }
                }
            }
        } catch (NoSuchMethodException e) {
            // Expected on Spring Boot < 2.4
        } catch (Exception e) {
            // 反射调用失败，静默忽略
        }

        return patterns;
    }
}
