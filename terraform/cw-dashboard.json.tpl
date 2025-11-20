{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          [ "AWS/EC2", "CPUUtilization", "InstanceId", "${instance_id}" ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "${region}",
        "title": "EC2 CPU"
      }
    },
    {
      "type": "metric",
      "x": 12, "y": 0, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          [ "CWAgent", "mem_used_percent", "InstanceId", "${instance_id}" ],
          [ ".", "disk_used_percent", "InstanceId", "${instance_id}", { "label": "Disk%" } ]
        ],
        "period": 300,
        "region": "${region}",
        "title": "Memory & Disk (CWAgent)"
      }
    },
    {
      "type": "log",
      "x": 0, "y": 6, "width": 24, "height": 6,
      "properties": {
        "query": "fields @timestamp, @message | sort @timestamp desc | limit 20",
        "region": "${region}",
        "title": "Latest App Logs"
      }
    }
  ]
}
