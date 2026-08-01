import { Request, Response, NextFunction } from 'express';

// Simple in-memory metrics store
const metrics = {
  httpRequestsTotal: new Map<string, number>(),
  httpRequestDurationSum: new Map<string, number>(),
  httpRequestDurationCount: new Map<string, number>(),
};

/**
 * Middleware to track HTTP requests and durations for Prometheus.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // in seconds
    const method = req.method;
    // Normalize path to prevent high cardinality (e.g. replace ids)
    const path = req.route ? req.route.path : req.path.replace(/\/[a-f0-9]{24}/ig, '/:id');
    const status = res.statusCode.toString();
    
    const labelKey = `method="${method}",path="${path}",status="${status}"`;
    
    // Increment total requests
    const currentTotal = metrics.httpRequestsTotal.get(labelKey) || 0;
    metrics.httpRequestsTotal.set(labelKey, currentTotal + 1);
    
    // Update duration sum and count
    const currentSum = metrics.httpRequestDurationSum.get(labelKey) || 0;
    metrics.httpRequestDurationSum.set(labelKey, currentSum + duration);
    
    const currentCount = metrics.httpRequestDurationCount.get(labelKey) || 0;
    metrics.httpRequestDurationCount.set(labelKey, currentCount + 1);
  });
  
  next();
}

/**
 * Controller to expose Prometheus formatted metrics.
 */
export function getMetrics(req: Request, res: Response): void {
  const lines: string[] = [];
  
  // HTTP requests total counter
  lines.push('# HELP http_requests_total Total number of HTTP requests.');
  lines.push('# TYPE http_requests_total counter');
  for (const [labels, value] of metrics.httpRequestsTotal.entries()) {
    lines.push(`http_requests_total{${labels}} ${value}`);
  }
  
  // HTTP requests duration sum
  lines.push('\n# HELP http_request_duration_seconds_sum Total duration of HTTP requests in seconds.');
  lines.push('# TYPE http_request_duration_seconds_sum counter');
  for (const [labels, value] of metrics.httpRequestDurationSum.entries()) {
    lines.push(`http_request_duration_seconds_sum{${labels}} ${value.toFixed(6)}`);
  }

  // HTTP requests duration count
  lines.push('\n# HELP http_request_duration_seconds_count Total count of HTTP requests timed.');
  lines.push('# TYPE http_request_duration_seconds_count counter');
  for (const [labels, value] of metrics.httpRequestDurationCount.entries()) {
    lines.push(`http_request_duration_seconds_count{${labels}} ${value}`);
  }
  
  // Process memory usage
  const mem = process.memoryUsage();
  lines.push('\n# HELP process_resident_memory_bytes Resident memory size in bytes.');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${mem.rss}`);
  
  lines.push('# HELP process_heap_total_bytes Total heap size in bytes.');
  lines.push('# TYPE process_heap_total_bytes gauge');
  lines.push(`process_heap_total_bytes ${mem.heapTotal}`);
  
  lines.push('# HELP process_heap_used_bytes Used heap size in bytes.');
  lines.push('# TYPE process_heap_used_bytes gauge');
  lines.push(`process_heap_used_bytes ${mem.heapUsed}`);
  
  // Process uptime
  lines.push('\n# HELP process_uptime_seconds Uptime of the process in seconds.');
  lines.push('# TYPE process_uptime_seconds counter');
  lines.push(`process_uptime_seconds ${process.uptime().toFixed(0)}`);
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
}
