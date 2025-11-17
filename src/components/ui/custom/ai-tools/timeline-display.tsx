import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface TimelineDisplayProps {
  entityId: string;
  entityType: string;
  events: Array<{
    id: string;
    date: string;
    title: string;
    description: string;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'success';
  }>;
}

export function TimelineDisplay({ entityId, entityType, events }: TimelineDisplayProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timeline
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {entityType} ID: {entityId}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex-shrink-0">
                  {getSeverityIcon(event.severity)}
                </div>
                {index < events.length - 1 && (
                  <div className="w-px h-8 bg-border mt-2"></div>
                )}
              </div>
              
              <div className={`flex-1 p-4 rounded-lg border ${getSeverityColor(event.severity)}`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{event.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}