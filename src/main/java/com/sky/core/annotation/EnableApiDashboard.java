package com.sky.core.annotation;

import com.sky.core.config.ApiDashboardConfig;
import org.springframework.context.annotation.Import;
import java.lang.annotation.*;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Import(ApiDashboardConfig.class)
public @interface EnableApiDashboard {
}
