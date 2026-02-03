package com.zk.sky.core.annotation;

import com.zk.sky.core.config.ApiDashboardConfig;
import org.springframework.context.annotation.Import;
import java.lang.annotation.*;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Import(ApiDashboardConfig.class)
public @interface EnableApiDashboard {
}
