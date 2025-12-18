from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union

@dataclass
class ModelMetrics:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    p50_response_time: float = 0.0
    p95_response_time: float = 0.0
    p99_response_time: float = 0.0

@dataclass
class ModelHealth:
    model: str
    status: str # 'healthy', 'degraded', 'unhealthy'
    success_rate: float
    average_response_time: float
    availability: float
    consecutive_failures: int
    metrics: ModelMetrics

class HealthMonitor:
    def __init__(self):
        # health_data[model] = {
        #   'response_times': [],
        #   'successes': 0,
        #   'failures': 0,
        #   'consecutive_failures': 0
        # }
        self.health_data: Dict[str, Dict] = {}

    def record_request(self, model: str, response_time_ms: float, success: bool, error: Optional[str] = None):
        if model not in self.health_data:
            self.health_data[model] = {
                'response_times': [],
                'successes': 0,
                'failures': 0,
                'consecutive_failures': 0
            }

        data = self.health_data[model]

        # Limit response times history to last 100 for stats
        data['response_times'].append(response_time_ms)
        if len(data['response_times']) > 100:
            data['response_times'].pop(0)

        if success:
            data['successes'] += 1
            data['consecutive_failures'] = 0
        else:
            data['failures'] += 1
            data['consecutive_failures'] += 1

    def get_health(self, model: str) -> ModelHealth:
        data = self.health_data.get(model, {
            'response_times': [], 'successes': 0, 'failures': 0, 'consecutive_failures': 0
        })

        total = data['successes'] + data['failures']
        success_rate = (data['successes'] / total) if total > 0 else 1.0

        times = sorted(data['response_times'])
        avg_time = sum(times) / len(times) if times else 0

        # Calculate percentiles
        def get_percentile(p: float):
            if not times: return 0
            idx = int(len(times) * p)
            return times[min(idx, len(times)-1)]

        status = 'healthy'
        if data['consecutive_failures'] >= 3 or success_rate < 0.8:
            status = 'unhealthy'
        elif success_rate < 0.95 or (times and get_percentile(0.95) > 5000): # > 5s latency
            status = 'degraded'

        return ModelHealth(
            model=model,
            status=status,
            success_rate=success_rate,
            average_response_time=avg_time,
            availability=success_rate, # Simplified for now
            consecutive_failures=data['consecutive_failures'],
            metrics=ModelMetrics(
                total_requests=total,
                successful_requests=data['successes'],
                failed_requests=data['failures'],
                p50_response_time=get_percentile(0.5),
                p95_response_time=get_percentile(0.95),
                p99_response_time=get_percentile(0.99)
            )
        )
